package com.camtoyz.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.OpenableColumns
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class PlaybackCaptureModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), ActivityEventListener, LifecycleEventListener,
  PlaybackCaptureService.Listener {

  companion object {
    private const val REQUEST_CAPTURE = 9042
    private const val REQUEST_LOCAL_TRACK = 9043
  }

  init {
    context.addActivityEventListener(this)
    context.addLifecycleEventListener(this)
    PlaybackCaptureService.listener = this
  }

  override fun getName() = "PlaybackCapture"

  @ReactMethod
  fun requestCapture() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      onStatus("unsupported")
      return
    }
    val activity = context.currentActivity ?: run {
      onStatus("unavailable")
      return
    }
    val manager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as android.media.projection.MediaProjectionManager
    activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
  }

  @ReactMethod
  fun requestLocalTrack() {
    val activity = context.currentActivity ?: run {
      onStatus("unavailable")
      return
    }
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "audio/*"
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    activity.startActivityForResult(intent, REQUEST_LOCAL_TRACK)
  }

  @ReactMethod
  fun startLocalTrack(trackUri: String) {
    PlaybackCaptureService.listener = this
    val serviceIntent = Intent(context, PlaybackCaptureService::class.java)
      .setAction(PlaybackCaptureService.ACTION_START_LOCAL)
      .putExtra(PlaybackCaptureService.EXTRA_TRACK_URI, trackUri)
    context.startForegroundService(serviceIntent)
  }

  @ReactMethod
  fun stopCapture() {
    context.startService(
      Intent(context, PlaybackCaptureService::class.java).setAction(PlaybackCaptureService.ACTION_STOP),
    )
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == REQUEST_LOCAL_TRACK) {
      if (resultCode != Activity.RESULT_OK || data?.data == null) {
        onStatus("selection_cancelled")
        return
      }
      val uri = data.data!!
      val takeFlags = data.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION
      runCatching { context.contentResolver.takePersistableUriPermission(uri, takeFlags) }
      val name = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
        ?.use { cursor ->
          val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
          if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        }
      onStatus("selected", trackUri = uri.toString(), trackName = name ?: "Canción seleccionada")
      return
    }

    if (requestCode != REQUEST_CAPTURE) return
    if (resultCode != Activity.RESULT_OK || data == null) {
      onStatus("denied")
      return
    }
    PlaybackCaptureService.listener = this
    val serviceIntent = Intent(context, PlaybackCaptureService::class.java)
      .setAction(PlaybackCaptureService.ACTION_START)
      .putExtra(PlaybackCaptureService.EXTRA_RESULT_CODE, resultCode)
      .putExtra(PlaybackCaptureService.EXTRA_RESULT_DATA, data)
    context.startForegroundService(serviceIntent)
  }

  override fun onLevel(db: Double, bassDb: Double) {
    val payload = Arguments.createMap().apply {
      putDouble("db", db)
      putDouble("bassDb", bassDb)
    }
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("playbackCaptureLevel", payload)
  }

  override fun onStatus(status: String, message: String?, trackUri: String?, trackName: String?) {
    val payload = Arguments.createMap().apply {
      putString("status", status)
      if (message != null) putString("message", message)
      if (trackUri != null) putString("trackUri", trackUri)
      if (trackName != null) putString("trackName", trackName)
    }
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("playbackCaptureStatus", payload)
  }

  override fun onNewIntent(intent: Intent) = Unit
  override fun onHostResume() = Unit
  override fun onHostPause() = Unit
  override fun onHostDestroy() {
    stopCapture()
    if (PlaybackCaptureService.listener === this) PlaybackCaptureService.listener = null
  }
}
