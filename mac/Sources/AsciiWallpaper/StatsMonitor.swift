import Darwin
import Foundation
import IOKit.ps

/// Sistem istatistiklerini okur. CPU ve ağ değerleri iki ölçüm arasındaki farktan hesaplanır,
/// bu yüzden `sample()` düzenli aralıklarla (saniyede bir) çağrılmalıdır.
final class StatsMonitor {
    struct Snapshot {
        var cpu: Double = 0
        var ramUsedGB: Double = 0
        var ramTotalGB: Double = 0
        var battery: Double?
        var charging = false
        var onBattery = false
        var downMBps: Double = 0
        var upMBps: Double = 0
    }

    private var lastTicks: (busy: UInt64, total: UInt64)?
    private var lastNet: (rx: UInt64, tx: UInt64, time: TimeInterval)?

    func sample() -> Snapshot {
        var s = Snapshot()
        s.cpu = cpuUsage()
        (s.ramUsedGB, s.ramTotalGB) = memory()
        (s.battery, s.charging, s.onBattery) = battery()
        (s.downMBps, s.upMBps) = network()
        return s
    }

    // MARK: CPU

    private func cpuUsage() -> Double {
        var load = host_cpu_load_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<host_cpu_load_info_data_t>.stride / MemoryLayout<integer_t>.stride)
        let result = withUnsafeMutablePointer(to: &load) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &count)
            }
        }
        guard result == KERN_SUCCESS else { return 0 }

        let user = UInt64(load.cpu_ticks.0)
        let system = UInt64(load.cpu_ticks.1)
        let idle = UInt64(load.cpu_ticks.2)
        let nice = UInt64(load.cpu_ticks.3)
        let busy = user + system + nice
        let total = busy + idle
        defer { lastTicks = (busy, total) }

        guard let last = lastTicks, total > last.total else { return 0 }
        return Double(busy - last.busy) / Double(total - last.total) * 100
    }

    // MARK: RAM

    private func memory() -> (Double, Double) {
        let totalBytes = Double(ProcessInfo.processInfo.physicalMemory)
        var stats = vm_statistics64_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.stride / MemoryLayout<integer_t>.stride)
        let result = withUnsafeMutablePointer(to: &stats) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }
        let gb = 1024.0 * 1024 * 1024
        guard result == KERN_SUCCESS else { return (0, totalBytes / gb) }

        // Etkinlik Monitörü'ndeki "Kullanılan bellek": uygulama belleği + kablolu + sıkıştırılmış
        let pageSize = Double(sysconf(_SC_PAGESIZE))
        let appPages = Double(stats.internal_page_count) - Double(stats.purgeable_count)
        let usedPages = appPages + Double(stats.wire_count) + Double(stats.compressor_page_count)
        return (max(0, usedPages * pageSize / gb), totalBytes / gb)
    }

    // MARK: Pil

    private func battery() -> (Double?, Bool, Bool) {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef]
        else { return (nil, false, false) }

        for source in list {
            guard let desc = IOPSGetPowerSourceDescription(info, source)?.takeUnretainedValue() as? [String: Any],
                  (desc[kIOPSTypeKey] as? String) == kIOPSInternalBatteryType
            else { continue }
            let current = desc[kIOPSCurrentCapacityKey] as? Double ?? 0
            let maximum = desc[kIOPSMaxCapacityKey] as? Double ?? 100
            let charging = desc[kIOPSIsChargingKey] as? Bool ?? false
            let onBattery = (desc[kIOPSPowerSourceStateKey] as? String) == kIOPSBatteryPowerValue
            return (maximum > 0 ? current / maximum * 100 : nil, charging, onBattery)
        }
        return (nil, false, false) // masaüstü Mac: pil yok
    }

    // MARK: Ağ

    private func network() -> (Double, Double) {
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let first = ifaddr else { return (0, 0) }
        defer { freeifaddrs(ifaddr) }

        var rx: UInt64 = 0, tx: UInt64 = 0
        for ptr in sequence(first: first, next: { $0.pointee.ifa_next }) {
            let ifa = ptr.pointee
            guard let addr = ifa.ifa_addr, addr.pointee.sa_family == UInt8(AF_LINK),
                  let data = ifa.ifa_data
            else { continue }
            let name = String(cString: ifa.ifa_name)
            // Sadece fiziksel arayüzler: Wi-Fi/Ethernet (en*) ve hücresel (pdp_ip*)
            guard name.hasPrefix("en") || name.hasPrefix("pdp_ip") else { continue }
            let stats = data.assumingMemoryBound(to: if_data.self).pointee
            rx += UInt64(stats.ifi_ibytes)
            tx += UInt64(stats.ifi_obytes)
        }

        let now = Date().timeIntervalSince1970
        defer { lastNet = (rx, tx, now) }
        guard let last = lastNet, now > last.time, rx >= last.rx, tx >= last.tx else { return (0, 0) }
        let mb = 1024.0 * 1024
        let dt = now - last.time
        return (Double(rx - last.rx) / dt / mb, Double(tx - last.tx) / dt / mb)
    }
}
