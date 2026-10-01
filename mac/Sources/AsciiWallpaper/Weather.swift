import Foundation

/// Open-Meteo'dan (API anahtarı gerektirmez) anlık hava durumunu çeker.
/// Konum ayarları: `defaults write dev.eymn.ascii-wallpaper city "Ankara"` ve
/// `latitude` / `longitude` anahtarları. Varsayılan İstanbul.
final class Weather {
    private(set) var text: String?

    private var city: String { UserDefaults.standard.string(forKey: "city") ?? "İstanbul" }
    private var latitude: Double { UserDefaults.standard.object(forKey: "latitude") as? Double ?? 41.01 }
    private var longitude: Double { UserDefaults.standard.object(forKey: "longitude") as? Double ?? 28.98 }

    private struct Response: Decodable {
        struct Current: Decodable {
            let temperature_2m: Double
            let weather_code: Int
        }
        let current: Current
    }

    func refresh(completion: @escaping () -> Void) {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "current", value: "temperature_2m,weather_code"),
        ]
        let city = self.city
        URLSession.shared.dataTask(with: components.url!) { [weak self] data, _, _ in
            guard let data, let response = try? JSONDecoder().decode(Response.self, from: data) else { return }
            let temp = Int(response.current.temperature_2m.rounded())
            let text = "\(city)  \(temp)°C  \(Weather.describe(response.current.weather_code))"
            DispatchQueue.main.async {
                self?.text = text
                completion()
            }
        }.resume()
    }

    /// WMO hava durumu kodları
    static func describe(_ code: Int) -> String {
        switch code {
        case 0: return "açık"
        case 1: return "az bulutlu"
        case 2: return "parçalı bulutlu"
        case 3: return "kapalı"
        case 45, 48: return "sisli"
        case 51, 53, 55, 56, 57: return "çisenti"
        case 61, 63, 65, 66, 67: return "yağmurlu"
        case 71, 73, 75, 77: return "karlı"
        case 80, 81, 82: return "sağanak"
        case 85, 86: return "kar sağanağı"
        case 95, 96, 99: return "fırtınalı"
        default: return "—"
        }
    }
}
