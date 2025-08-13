#pragma once

#include <CoreGraphics/CoreGraphics.h>
#include <Carbon/Carbon.h>
#include <string>
#include <functional>
#include <chrono>
#include <vector>

struct AXPoint {
    int x;
    int y;
};

struct Frame {
    int x;
    int y;
    int width;
    int height;
};

struct Modifiers {
    bool shift = false;
    bool control = false;
    bool option = false;
    bool command = false;
};

struct ApplicationInfo {
    std::string name;
    int processId;
};

struct TargetDescriptor {
    std::string role;
    std::string title;
    std::string identifier;
    std::string value;
    Frame frame;
    std::vector<std::string> ancestry;
};

struct RecordedStep {
    long long timestamp;
    std::string sessionId;
    std::string action;
    std::string button;
    std::string text;
    AXPoint location;
    Modifiers modifiers;
    TargetDescriptor targetDescriptor;
    ApplicationInfo appInfo;
};

class EventMonitor {
public:
    static EventMonitor* getInstance();
    
    bool startRecording(const std::string& sessionId);
    void stopRecording();
    bool isRecordingActive() const { return isRecording; }
    
    void setStepCallback(std::function<void(const RecordedStep&)> callback);
    
private:
    EventMonitor();
    ~EventMonitor();
    
    static EventMonitor* instance;
    static CGEventRef mouseEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon);
    static CGEventRef keyEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon);
    
    CGEventRef handleMouseEvent(CGEventType type, CGEventRef event);
    CGEventRef handleKeyEvent(CGEventType type, CGEventRef event);
    
    AXUIElementRef getFocusedElement();
    ApplicationInfo getCurrentApplication();
    
    bool isRecording;
    std::string sessionId;
    CFMachPortRef mouseEventTap;
    CFMachPortRef keyEventTap;
    CFRunLoopRef runLoop;
    CFRunLoopSourceRef mouseRunLoopSource;
    CFRunLoopSourceRef keyRunLoopSource;
    
    std::function<void(const RecordedStep&)> stepCallback;
};