cmake_minimum_required(VERSION 3.20)
project(FortniteOptimizer2026 VERSION 2026.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(ENABLE_ANTI_DEBUG "Build with anti-debug checks" OFF)

# ── Fetch Dear ImGui ──
include(FetchContent)
FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG        v1.91.5
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(imgui)

add_library(imgui_lib STATIC
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_win32.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_dx11.cpp
)
target_include_directories(imgui_lib PUBLIC
    ${imgui_SOURCE_DIR}
    ${imgui_SOURCE_DIR}/backends
)
target_compile_definitions(imgui_lib PUBLIC IMGUI_IMPL_WIN32_DISABLE_GAMEPAD)

# ── Headers ──
set(HEADERS
    include/licensing.h
    include/hwid.h
    include/http_client.h
    include/crypto_utils.h
    include/anti_debug.h
    include/gui.h
    include/tweaks.h
)

# ── Sources ──
set(SOURCES
    src/main.cpp
    src/licensing.cpp
    src/hwid.cpp
    src/http_client.cpp
    src/crypto_utils.cpp
    src/gui.cpp
    src/tweaks.cpp
)

if(ENABLE_ANTI_DEBUG)
    list(APPEND SOURCES src/anti_debug.cpp)
else()
    list(APPEND SOURCES src/anti_debug_stub.cpp)
endif()

# ── Executable ──
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})
target_include_directories(${PROJECT_NAME} PRIVATE include)

# ── Definitions ──
target_compile_definitions(${PROJECT_NAME} PRIVATE
    APP_VERSION="${PROJECT_VERSION}"
    APP_NAME="${PROJECT_NAME}"
    $<$<BOOL:${ENABLE_ANTI_DEBUG}>:ENABLE_ANTI_DEBUG=1>
    $<$<NOT:$<BOOL:${ENABLE_ANTI_DEBUG}>>:ENABLE_ANTI_DEBUG=0>
)

# ── Windows libraries ──
if(WIN32)
    target_link_libraries(${PROJECT_NAME} PRIVATE
        imgui_lib
        advapi32
        bcrypt
        winhttp
        shlwapi
        shell32
        d3d11
        dxgi
    )
endif()

# ── Compiler / Linker flags ──
if(MSVC)
    target_compile_options(${PROJECT_NAME} PRIVATE
        /W4
        /O2
        /GS
        /D_CRT_SECURE_NO_WARNINGS
        /DUNICODE
        /D_UNICODE
        /permissive-
    )
    target_link_options(${PROJECT_NAME} PRIVATE
        /SUBSYSTEM:WINDOWS
        /ENTRY:mainCRTStartup
        /DYNAMICBASE
        /NXCOMPAT
    )
endif()