package com.camtoyz.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.MediaPlayer
import android.media.audiofx.Visualizer
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.concurrent.Executors
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/** Owns both external playback capture and local-file playback analysis. */
class PlaybackCaptureService : Service() {
  interface Listener {
    fun onLevel(db: Double, bassDb: Double)
    fun onStatus(
      status: String,
      message: String? = null,
      trackUri: String? = null,
      trackName: String? = null,
    )
  }

  companion object {
    const val ACTION_START = "com.camtoyz.app.playback.START"
    const val ACTION_START_LOCAL = "com.camtoyz.app.playback.START_LOCAL"
    const val ACTION_STOP = "com.camtoyz.app.playback.STOP"
    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_RESULT_DATA = "resultData"
    const val EXTRA_TRACK_URI = "trackUri"
    private const val NOTIFICATION_ID = 9042
    private const val CHANNEL_ID = "playback_capture"
    private const val SAMPLE_RATE = 44100
    private const val TAG = "CamtoyzAudio"

    @Volatile var listener: Listener? = null
  }

  private var projection: MediaProjection? = null
  private var recorder: AudioRecord? = null
  private var mediaPlayer: MediaPlayer? = null
  private var visualizer: Visualizer? = null
  @Volatile private var capturing = false
  @Volatile private var latestWaveDb = -100.0
  private val worker = Executors.newSingleThreadExecutor()
  private var captureGeneration = 0
  private var frameNumber = 0

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelfSafely()
      return START_NOT_STICKY
    }

    when (intent?.action) {
      ACTION_START -> {
        enterForeground(ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION, "Analizando audio interno")
        startCapture(intent)
      }
      ACTION_START_LOCAL -> {
        enterForeground(ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK, "Reproduciendo música del dispositivo")
        startLocalTrack(intent.getStringExtra(EXTRA_TRACK_URI))
      }
      else -> stopSelf()
    }
    return START_NOT_STICKY
  }

  private fun enterForeground(serviceType: Int, text: String) {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Control musical", NotificationManager.IMPORTANCE_LOW),
      )
    }
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Control musical activo")
      .setContentText(text)
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, serviceType)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun startCapture(intent: Intent) {
    stopEngines(stopProjection = true)
    val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
    val resultData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
    } else {
      @Suppress("DEPRECATION") intent.getParcelableExtra(EXTRA_RESULT_DATA)
    }
    if (resultData == null) {
      fail("Android no entregó la autorización de captura.")
      return
    }

    try {
      val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      projection = projectionManager.getMediaProjection(resultCode, resultData)
      projection?.registerCallback(object : MediaProjection.Callback() {
        override fun onStop() {
          stopEngines(stopProjection = false)
          listener?.onStatus("stopped")
          stopSelf()
        }
      }, Handler(Looper.getMainLooper()))

      val format = AudioFormat.Builder()
        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
        .setSampleRate(SAMPLE_RATE)
        .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
        .build()
      val minimum = AudioRecord.getMinBufferSize(
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
      )
      val bufferSize = max(minimum * 2, 4096)
      val config = AudioPlaybackCaptureConfiguration.Builder(projection!!)
        .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
        .addMatchingUsage(AudioAttributes.USAGE_GAME)
        .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
        .build()
      recorder = AudioRecord.Builder()
        .setAudioFormat(format)
        .setBufferSizeInBytes(bufferSize)
        .setAudioPlaybackCaptureConfig(config)
        .build()
      check(recorder?.state == AudioRecord.STATE_INITIALIZED) { "AudioRecord no pudo inicializarse" }
      recorder?.startRecording()
      capturing = true
      captureGeneration += 1
      val generation = captureGeneration
      frameNumber = 0
      listener?.onStatus("active")
      worker.execute { captureLoop(bufferSize / 2, generation) }
    } catch (error: Throwable) {
      Log.e(TAG, "Playback capture failed", error)
      fail(error.message ?: "No fue posible iniciar la captura interna.")
    }
  }

  private fun captureLoop(sampleCount: Int, generation: Int) {
    val samples = ShortArray(sampleCount)
    while (capturing && generation == captureGeneration) {
      val count = recorder?.read(samples, 0, samples.size) ?: break
      if (count <= 0) continue
      val db = calculateDb(samples, count)
      val bassDb = calculateBassDb(samples, count)
      frameNumber += 1
      if (frameNumber % 12 == 0) Log.d(TAG, "level db=%.1f bass=%.1f".format(db, bassDb))
      listener?.onLevel(db, bassDb)
    }
  }

  private fun startLocalTrack(uriValue: String?) {
    stopEngines(stopProjection = true)
    frameNumber = 0
    if (uriValue.isNullOrBlank()) {
      fail("Selecciona primero una canción del dispositivo.")
      return
    }

    try {
      val player = MediaPlayer()
      mediaPlayer = player
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build(),
      )
      player.setDataSource(applicationContext, Uri.parse(uriValue))
      player.setOnPreparedListener { prepared ->
        try {
          attachVisualizer(prepared.audioSessionId)
          prepared.start()
          listener?.onStatus("active")
        } catch (error: Throwable) {
          Log.e(TAG, "Local analyzer failed", error)
          fail(error.message ?: "No fue posible analizar la canción seleccionada.")
        }
      }
      player.setOnCompletionListener {
        listener?.onStatus("completed")
        stopEngines(stopProjection = true)
        stopSelf()
      }
      player.setOnErrorListener { _, what, extra ->
        fail("No fue posible reproducir la canción ($what/$extra).")
        true
      }
      player.prepareAsync()
    } catch (error: Throwable) {
      Log.e(TAG, "Local playback failed", error)
      fail(error.message ?: "No fue posible abrir la canción seleccionada.")
    }
  }

  private fun attachVisualizer(audioSessionId: Int) {
    val analyzer = Visualizer(audioSessionId)
    val range = Visualizer.getCaptureSizeRange()
    analyzer.captureSize = min(1024, range[1]).coerceAtLeast(range[0])
    // Conserva la dinamica real de la pista. NORMALIZED amplifica cada ventana
    // por separado y hace que golpes suaves y fuertes parezcan iguales.
    analyzer.scalingMode = Visualizer.SCALING_MODE_AS_PLAYED
    analyzer.setDataCaptureListener(object : Visualizer.OnDataCaptureListener {
      override fun onWaveFormDataCapture(visualizer: Visualizer?, waveform: ByteArray?, samplingRate: Int) {
        if (waveform == null || waveform.isEmpty()) return
        var sum = 0.0
        for (sample in waveform) {
          val centered = (sample.toInt() and 0xff) - 128
          sum += centered.toDouble() * centered.toDouble()
        }
        val rms = sqrt(sum / waveform.size) / 128.0
        latestWaveDb = if (rms <= 0.0) -100.0 else 20 * log10(rms)
      }

      override fun onFftDataCapture(visualizer: Visualizer?, fft: ByteArray?, samplingRate: Int) {
        if (fft == null || fft.size < 4) return
        val sampleRateHz = samplingRate / 1000.0
        var magnitudeSum = 0.0
        var bins = 0
        for (bin in 1 until fft.size / 2) {
          val frequency = bin * sampleRateHz / fft.size
          if (frequency < 45.0 || frequency > 180.0) continue
          val real = fft[bin * 2].toDouble()
          val imaginary = fft[bin * 2 + 1].toDouble()
          magnitudeSum += sqrt(real * real + imaginary * imaginary)
          bins += 1
        }
        val normalized = if (bins == 0) 0.0 else (magnitudeSum / bins) / 128.0
        val bassDb = if (normalized <= 0.0) -100.0 else 20 * log10(normalized)
        frameNumber += 1
        if (frameNumber % 12 == 0) {
          Log.d(TAG, "local level db=%.1f bass=%.1f".format(latestWaveDb, bassDb))
        }
        listener?.onLevel(latestWaveDb, bassDb)
      }
    }, Visualizer.getMaxCaptureRate(), true, true)
    analyzer.enabled = true
    visualizer = analyzer
  }

  private fun calculateDb(samples: ShortArray, count: Int): Double {
    var sum = 0.0
    for (index in 0 until count) sum += samples[index].toDouble() * samples[index].toDouble()
    val rms = sqrt(sum / count)
    return if (rms <= 0.0) -100.0 else 20 * log10(rms / Short.MAX_VALUE)
  }

  private fun calculateBassDb(samples: ShortArray, count: Int): Double {
    val frequencies = doubleArrayOf(55.0, 80.0, 110.0, 160.0)
    var magnitudeSum = 0.0
    for (frequency in frequencies) {
      val coefficient = 2.0 * cos(2.0 * PI * frequency / SAMPLE_RATE)
      var previous = 0.0
      var previousTwo = 0.0
      for (index in 0 until count) {
        val window = 0.5 - 0.5 * cos(2.0 * PI * index / max(1, count - 1))
        val current = samples[index] * window + coefficient * previous - previousTwo
        previousTwo = previous
        previous = current
      }
      val power = previousTwo * previousTwo + previous * previous - coefficient * previous * previousTwo
      magnitudeSum += sqrt(max(0.0, power)) / count
    }
    val averageMagnitude = magnitudeSum / frequencies.size
    return if (averageMagnitude <= 0.0) -100.0 else 20 * log10(averageMagnitude / Short.MAX_VALUE)
  }

  private fun fail(message: String) {
    stopEngines(stopProjection = true)
    listener?.onStatus("error", message)
    stopSelf()
  }

  private fun stopSelfSafely() {
    stopEngines(stopProjection = true)
    listener?.onStatus("stopped")
    stopSelf()
  }

  private fun stopEngines(stopProjection: Boolean) {
    capturing = false
    captureGeneration += 1
    recorder?.runCatching { stop() }
    recorder?.release()
    recorder = null

    visualizer?.runCatching { enabled = false }
    visualizer?.release()
    visualizer = null
    mediaPlayer?.runCatching { stop() }
    mediaPlayer?.release()
    mediaPlayer = null

    val currentProjection = projection
    projection = null
    if (stopProjection) currentProjection?.runCatching { stop() }
  }

  override fun onDestroy() {
    stopEngines(stopProjection = true)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
