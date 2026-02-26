cmake_minimum_required(VERSION 3.20)
project(FortniteOptimizer2026 VERSION 2026.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Qt 6 AUTOMOC — required for Q_OBJECT macro processing
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

option(ENABLE_ANTI_DEBUG "Build with anti-debug checks" OFF)

# ── Qt 6 ──────────────────────────────────────────────────────────────
find_package(Qt6 REQUIRED COMPONENTS Widgets Core Concurrent)

# ── Headers ───────────────────────────────────────────────────────────
set(HEADERS
    include/licensing.h
    include/hwid.h
    include/http_client.h
    include/crypto_utils.h
    include/anti_debug.h
    include/gui.h
    include/tweaks.h
    include/updater.h
    include/Palette.h
    include/AppController.h
    include/MainWindow.h
    include/TitleBarWidget.h
    include/LicenseScreen.h
    include/SidebarWidget.h
    include/DashboardPage.h
    include/ModulesPage.h
    include/LogsPage.h
    include/SettingsPage.h
    include/UpdateDialog.h
    include/GlassCard.h
    include/HoverCard.h
    include/GlowButton.h
    include/FadeLabel.h
    include/AnimatedStackedWidget.h
    include/SystemStats.h
    include/MiniGraph.h
    include/SystemMonitorWidget.h
)

# ── Sources ────────────────────────────────────────────────────────────
set(SOURCES
    src/app.rc
    src/main.cpp
    src/licensing.cpp
    src/hwid.cpp
    src/http_client.cpp
    src/crypto_utils.cpp
    src/gui.cpp
    src/tweaks.cpp
    src/updater.cpp
    src/AppController.cpp
    src/MainWindow.cpp
    src/TitleBarWidget.cpp
    src/LicenseScreen.cpp
    src/SidebarWidget.cpp
    src/DashboardPage.cpp
    src/ModulesPage.cpp
    src/LogsPage.cpp
    src/SettingsPage.cpp
    src/UpdateDialog.cpp
    src/GlassCard.cpp
    src/HoverCard.cpp
    src/GlowButton.cpp
    src/FadeLabel.cpp
    src/AnimatedStackedWidget.cpp
    src/SystemStats.cpp
    src/MiniGraph.cpp
    src/SystemMonitorWidget.cpp
)

if(ENABLE_ANTI_DEBUG)
    list(APPEND SOURCES src/anti_debug.cpp)
else()
    list(APPEND SOURCES src/anti_debug_stub.cpp)
endif()

# ── Executable (WIN32 = no console window) ────────────────────────────
add_executable(${PROJECT_NAME} WIN32 ${SOURCES} ${HEADERS})
target_include_directories(${PROJECT_NAME} PRIVATE include)

# ── Qt libraries ──────────────────────────────────────────────────────
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Widgets
    Qt6::Core
    Qt6::Concurrent
)

# ── Compile definitions ───────────────────────────────────────────────
target_compile_definitions(${PROJECT_NAME} PRIVATE
    APP_VERSION="${PROJECT_VERSION}"
    APP_NAME="${PROJECT_NAME}"
    $<$<BOOL:${ENABLE_ANTI_DEBUG}>:ENABLE_ANTI_DEBUG=1>
    $<$<NOT:$<BOOL:${ENABLE_ANTI_DEBUG}>>:ENABLE_ANTI_DEBUG=0>
)

# ── Windows-only system libraries ─────────────────────────────────────
if(WIN32)
    target_link_libraries(${PROJECT_NAME} PRIVATE
        advapi32
        bcrypt
        winhttp
        shlwapi
        shell32
        dwmapi       # DWM drop shadow on frameless window
        pdh          # Performance Data Helper (GPU usage via PDH counters)
    )
    target_compile_definitions(${PROJECT_NAME} PRIVATE
        _WIN32_WINNT=0x0A00
        NOMINMAX
        WIN32_LEAN_AND_MEAN
        UNICODE
        _UNICODE
    )
endif()

# ── Compiler / Linker flags ───────────────────────────────────────────
if(MSVC)
    target_compile_options(${PROJECT_NAME} PRIVATE
        /W3 /O2 /GS
        /D_CRT_SECURE_NO_WARNINGS
        /permissive-
        /wd4127 /wd4458
    )
    target_link_options(${PROJECT_NAME} PRIVATE /DYNAMICBASE /NXCOMPAT)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")   # MinGW / GCC
    target_compile_options(${PROJECT_NAME} PRIVATE
        -Wall -Wextra -O2
        -Wno-unused-parameter
        -Wno-missing-field-initializers
    )
    # MinGW: entry point for WIN32 subsystem (no console)
    if(WIN32 AND MINGW)
        target_link_options(${PROJECT_NAME} PRIVATE -mwindows)
    endif()
endif()

# ── Qt deploy helper (windeployqt — copies Qt DLLs next to .exe) ──────
if(WIN32)
    # Locate windeployqt next to qmake (works for both MSVC and MinGW kits)
    get_target_property(_qmake_exe Qt6::qmake IMPORTED_LOCATION)
    get_filename_component(_qt_bin_dir "${_qmake_exe}" DIRECTORY)

    add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND "${_qt_bin_dir}/windeployqt.exe"
                --no-translations
                --no-system-d3d-compiler
                $<TARGET_FILE:${PROJECT_NAME}>
        COMMENT "Running windeployqt..."
        VERBATIM
    )
endif()
