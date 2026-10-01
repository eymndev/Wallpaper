// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "AsciiWallpaper",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "AsciiWallpaper",
            path: "Sources/AsciiWallpaper",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("WebKit"),
                .linkedFramework("IOKit"),
                .linkedFramework("ServiceManagement"),
            ]
        ),
    ]
)
