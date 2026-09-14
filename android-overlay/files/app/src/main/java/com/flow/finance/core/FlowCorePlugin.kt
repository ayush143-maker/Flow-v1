package com.flow.finance.core

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * FlowCore — Flow's single native engine.
 *
 * Phase 1: health check only. Later phases grow this plugin with:
 *   - SQLite schema + repositories (Phase 3)
 *   - incremental SMS ingestion + parser (Phase 4)
 *   - NotificationListenerService ingestion (Phase 5)
 *   - duplicate detection (Phase 6)
 *
 * Everything stays on-device; this plugin never performs network I/O.
 */
@CapacitorPlugin(name = "FlowCore")
class FlowCorePlugin : Plugin() {

    companion object {
        const val ENGINE_VERSION = "1.0.0"
    }

    @PluginMethod
    fun getEngineInfo(call: PluginCall) {
        val info = JSObject()
        info.put("native", true)
        info.put("platform", "android")
        info.put("version", ENGINE_VERSION)
        call.resolve(info)
    }
}
