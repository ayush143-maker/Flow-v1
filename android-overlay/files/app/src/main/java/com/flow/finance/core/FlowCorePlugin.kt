package com.flow.finance.core

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * FlowCore — Flow's single native engine.
 *
 * Phase 1: health check. Phase 2 (this version): real permission plumbing —
 * SMS runtime permission + notification-listener special access. Later phases
 * grow this plugin with SQLite, the SMS reader, the parser, the notification
 * listener and duplicate detection. Everything stays on-device; this plugin
 * never performs network I/O.
 */
@CapacitorPlugin(name = "FlowCore")
class FlowCorePlugin : Plugin() {

    companion object {
        const val ENGINE_VERSION = "1.1.0"
        private const val SMS_PERMISSION_REQUEST = 5017
    }

    @PluginMethod
    fun getEngineInfo(call: PluginCall) {
        val info = JSObject()
        info.put("native", true)
        info.put("platform", "android")
        info.put("version", ENGINE_VERSION)
        call.resolve(info)
    }

    /** Live READ_SMS state — the UI polls this after dialogs and on resume. */
    @PluginMethod
    fun checkSmsPermission(call: PluginCall) {
        val result = JSObject()
        result.put("granted", hasSmsPermission())
        call.resolve(result)
    }

    /** Opens the Android runtime-permission dialog for READ_SMS. */
    @PluginMethod
    fun requestSmsPermission(call: PluginCall) {
        val activity = bridge?.activity
        if (activity == null) {
            call.reject("Activity unavailable")
            return
        }
        if (hasSmsPermission()) {
            val result = JSObject()
            result.put("requested", false)
            result.put("granted", true)
            call.resolve(result)
            return
        }
        activity.requestPermissions(
            arrayOf(Manifest.permission.READ_SMS),
            SMS_PERMISSION_REQUEST
        )
        val result = JSObject()
        result.put("requested", true)
        result.put("granted", false)
        call.resolve(result)
    }

    /** Opens the special-access "Notification access" screen in Android Settings. */
    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val activity = bridge?.activity
        if (activity == null) {
            call.reject("Activity unavailable")
            return
        }
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        activity.startActivity(intent)
        call.resolve()
    }

    /** Whether our (Phase 5) notification listener is enabled by the user. */
    @PluginMethod
    fun isNotificationListenerEnabled(call: PluginCall) {
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        ) ?: ""
        val enabled = flat.split(":").any {
            it.isNotBlank() && context.packageName.equals(
                it.substringBefore('/'),
                ignoreCase = true
            )
        }
        val result = JSObject()
        result.put("enabled", enabled)
        call.resolve(result)
    }

    private fun hasSmsPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.READ_SMS) ==
            PackageManager.PERMISSION_GRANTED
    }
}
