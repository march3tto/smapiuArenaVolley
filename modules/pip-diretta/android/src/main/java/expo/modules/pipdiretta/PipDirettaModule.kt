package expo.modules.pipdiretta

import android.app.PictureInPictureParams
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Stato condiviso tra il modulo JS e il listener dell'activity */
internal object PipState {
  @Volatile var enabled = false
  @Volatile var onChange: ((Boolean) -> Unit)? = null

  fun supported(context: Context?): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      context?.packageManager?.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE) == true

  fun params(enabled: Boolean): PictureInPictureParams {
    val builder = PictureInPictureParams.Builder().setAspectRatio(Rational(16, 9))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      // Android 12+: il sistema entra da solo in PiP quando si esce dall'app
      builder.setAutoEnterEnabled(enabled).setSeamlessResizeEnabled(true)
    }
    return builder.build()
  }
}

/**
 * Picture in Picture dell'intera activity mentre la diretta è aperta: uscendo dall'app (Home, cambio app)
 * resta visibile la finestrella, e il JS mostra solo il video a tutta area.
 */
class PipDirettaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PipDiretta")
    Events("onPipChange")

    Function("isSupported") { PipState.supported(appContext.reactContext) }

    Function("setEnabled") { enabled: Boolean ->
      PipState.enabled = enabled
      val activity = appContext.currentActivity ?: return@Function
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && PipState.supported(activity)) {
        activity.runOnUiThread { runCatching { activity.setPictureInPictureParams(PipState.params(enabled)) } }
      }
    }

    OnCreate { PipState.onChange = { active -> sendEvent("onPipChange", mapOf("active" to active)) } }
    OnDestroy { PipState.onChange = null }
  }
}
