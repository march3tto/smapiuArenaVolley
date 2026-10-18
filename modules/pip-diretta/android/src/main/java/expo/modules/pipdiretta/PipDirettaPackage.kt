package expo.modules.pipdiretta

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

internal class PipLifecycleListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
    (activity as? ComponentActivity)?.addOnPictureInPictureModeChangedListener { info ->
      PipState.onChange?.invoke(info.isInPictureInPictureMode)
    }
  }

  // Android 8–11: niente ingresso automatico, si entra quando l'utente lascia l'app
  override fun onUserLeaveHint(activity: Activity) {
    if (!PipState.enabled || Build.VERSION.SDK_INT >= Build.VERSION_CODES.S || !PipState.supported(activity)) return
    runCatching { activity.enterPictureInPictureMode(PipState.params(true)) }
  }
}

class PipDirettaPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
    listOf(PipLifecycleListener())
}
