{
  "targets": [
    {
      "target_name": "ax_recorder",
      "sources": [
        "src/native/ax_recorder.cpp",
        "src/native/ax_element.cpp",
        "src/native/event_monitor.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15"
          },
          "link_settings": {
            "libraries": [
              "-framework ApplicationServices",
              "-framework Carbon",
              "-framework CoreGraphics",
              "-framework Foundation"
            ]
          }
        }]
      ]
    }
  ]
}