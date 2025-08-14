#include "event_monitor.h"
#include "ax_element.h"
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <iostream>

EventMonitor* EventMonitor::instance = nullptr;

EventMonitor::EventMonitor() : 
    isRecording(false), 
    mouseEventTap(nullptr),
    keyEventTap(nullptr),
    runLoop(nullptr),
    mouseRunLoopSource(nullptr),
    keyRunLoopSource(nullptr) {}

EventMonitor::~EventMonitor() {
    stopRecording();
}

EventMonitor* EventMonitor::getInstance() {
    if (!instance) {
        instance = new EventMonitor();
    }
    return instance;
}

bool EventMonitor::startRecording(const std::string& sessionId) {
    if (isRecording) {
        return false;
    }
    
    this->sessionId = sessionId;
    
    // Create event taps for mouse events
    mouseEventTap = CGEventTapCreate(
        kCGSessionEventTap,
        kCGHeadInsertEventTap,
        kCGEventTapOptionDefault,
        CGEventMaskBit(kCGEventLeftMouseDown) | 
        CGEventMaskBit(kCGEventRightMouseDown) |
        CGEventMaskBit(kCGEventLeftMouseUp) |
        CGEventMaskBit(kCGEventRightMouseUp) |
        CGEventMaskBit(kCGEventLeftMouseDragged) |
        CGEventMaskBit(kCGEventRightMouseDragged) |
        CGEventMaskBit(kCGEventMouseMoved),
        mouseEventCallback,
        this
    );
    
    // Create event taps for key events
    keyEventTap = CGEventTapCreate(
        kCGSessionEventTap,
        kCGHeadInsertEventTap,
        kCGEventTapOptionDefault,
        CGEventMaskBit(kCGEventKeyDown) | 
        CGEventMaskBit(kCGEventKeyUp) |
        CGEventMaskBit(kCGEventFlagsChanged),
        keyEventCallback,
        this
    );
    
    if (!mouseEventTap || !keyEventTap) {
        std::cerr << "Failed to create event taps. Make sure accessibility permissions are granted." << std::endl;
        std::cerr << "mouseEventTap: " << (mouseEventTap ? "OK" : "FAILED") << std::endl;
        std::cerr << "keyEventTap: " << (keyEventTap ? "OK" : "FAILED") << std::endl;
        stopRecording();
        return false;
    }
    
    std::cout << "Event taps created successfully!" << std::endl;
    std::cout << "mouseEventTap: " << mouseEventTap << std::endl;
    std::cout << "keyEventTap: " << keyEventTap << std::endl;
    
    // Create run loop sources
    mouseRunLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, mouseEventTap, 0);
    keyRunLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, keyEventTap, 0);
    
    // Get the current run loop
    runLoop = CFRunLoopGetCurrent();
    
    // Add sources to run loop
    CFRunLoopAddSource(runLoop, mouseRunLoopSource, kCFRunLoopCommonModes);
    CFRunLoopAddSource(runLoop, keyRunLoopSource, kCFRunLoopCommonModes);
    
    // Enable the event taps
    CGEventTapEnable(mouseEventTap, true);
    CGEventTapEnable(keyEventTap, true);
    
    isRecording = true;
    return true;
}

void EventMonitor::stopRecording() {
    if (!isRecording) {
        return;
    }
    
    isRecording = false;
    
    if (mouseEventTap) {
        CGEventTapEnable(mouseEventTap, false);
        CFRelease(mouseEventTap);
        mouseEventTap = nullptr;
    }
    
    if (keyEventTap) {
        CGEventTapEnable(keyEventTap, false);
        CFRelease(keyEventTap);
        keyEventTap = nullptr;
    }
    
    if (mouseRunLoopSource) {
        CFRunLoopRemoveSource(runLoop, mouseRunLoopSource, kCFRunLoopCommonModes);
        CFRelease(mouseRunLoopSource);
        mouseRunLoopSource = nullptr;
    }
    
    if (keyRunLoopSource) {
        CFRunLoopRemoveSource(runLoop, keyRunLoopSource, kCFRunLoopCommonModes);
        CFRelease(keyRunLoopSource);
        keyRunLoopSource = nullptr;
    }
    
    runLoop = nullptr;
}

void EventMonitor::setStepCallback(std::function<void(const RecordedStep&)> callback) {
    std::cout << "setStepCallback called, callback=" << (callback ? "YES" : "NO") << std::endl;
    stepCallback = callback;
}

CGEventRef EventMonitor::mouseEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon) {
    EventMonitor* monitor = static_cast<EventMonitor*>(refcon);
    return monitor->handleMouseEvent(type, event);
}

CGEventRef EventMonitor::keyEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon) {
    EventMonitor* monitor = static_cast<EventMonitor*>(refcon);
    return monitor->handleKeyEvent(type, event);
}

CGEventRef EventMonitor::handleMouseEvent(CGEventType type, CGEventRef event) {
    
    if (!isRecording || !stepCallback) {
        std::cout << "EARLY RETURN: Not recording or no callback" << std::endl;
        return event;
    }
        
    CGPoint location = CGEventGetLocation(event);
    
    RecordedStep step;
    step.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    step.sessionId = sessionId;
    
    // Get AX element at the click point
    AXUIElementRef element = AXElementInfo::getElementAtPoint(location);
    if (element) {
        AXElementInfo elementInfo;
        elementInfo.setElement(element);
        
        step.targetDescriptor.role = elementInfo.getStringAttribute(kAXRoleAttribute);
        step.targetDescriptor.title = elementInfo.getStringAttribute(kAXTitleAttribute);
        step.targetDescriptor.identifier = elementInfo.getStringAttribute(kAXIdentifierAttribute);
        step.targetDescriptor.value = elementInfo.getStringAttribute(kAXValueAttribute);
        step.targetDescriptor.ancestry = elementInfo.getAncestryPath();
        
        CGRect frame = elementInfo.getFrame();
        step.targetDescriptor.frame = {
            static_cast<int>(frame.origin.x),
            static_cast<int>(frame.origin.y),
            static_cast<int>(frame.size.width),
            static_cast<int>(frame.size.height)
        };
        
        CFRelease(element);
    }
    
    step.location = {static_cast<int>(location.x), static_cast<int>(location.y)};
    
    switch (type) {
        case kCGEventLeftMouseDown:
            step.action = "click";
            step.button = "left";
            std::cout << "Recording left click at (" << location.x << ", " << location.y << ")" << std::endl;
            break;
        case kCGEventRightMouseDown:
            step.action = "click";
            step.button = "right";
            std::cout << "Recording right click at (" << location.x << ", " << location.y << ")" << std::endl;
            break;
        case kCGEventLeftMouseUp:
        case kCGEventRightMouseUp:
            // We only record mouse down events as clicks
            return event;
        case kCGEventLeftMouseDragged:
        case kCGEventRightMouseDragged:
            step.action = "drag";
            step.button = (type == kCGEventLeftMouseDragged) ? "left" : "right";
            std::cout << "Recording drag at (" << location.x << ", " << location.y << ")" << std::endl;
            break;
        case kCGEventMouseMoved:
            // Skip regular mouse moves to avoid noise
            return event;
        default:
            std::cout << "Ignoring unknown event type: " << type << std::endl;
            return event;
    }
    
    // Get the current application
    step.appInfo = getCurrentApplication();
    
    std::cout << "Calling stepCallback with step: " << step.action << std::endl;
    stepCallback(step);
    std::cout << "stepCallback completed" << std::endl;
    return event;
}

CGEventRef EventMonitor::handleKeyEvent(CGEventType type, CGEventRef event) {
    if (!isRecording || !stepCallback) {
        return event;
    }
    
    if (type != kCGEventKeyDown) {
        return event; // Only process key down events
    }
    
    CGKeyCode keyCode = static_cast<CGKeyCode>(CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode));
    CGEventFlags flags = CGEventGetFlags(event);
    
    RecordedStep step;
    step.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    step.sessionId = sessionId;
    step.action = "type";
    
    // Get the character representation
    UniChar unicodeString[4];
    UniCharCount actualStringLength;
    
    CGEventKeyboardGetUnicodeString(event, 4, &actualStringLength, unicodeString);
    
    if (actualStringLength > 0) {
        CFStringRef stringRef = CFStringCreateWithCharacters(kCFAllocatorDefault, unicodeString, actualStringLength);
        if (stringRef) {
            const char* cString = CFStringGetCStringPtr(stringRef, kCFStringEncodingUTF8);
            if (cString) {
                step.text = std::string(cString);
            } else {
                CFIndex length = CFStringGetLength(stringRef);
                CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                char* buffer = new char[maxSize];
                if (CFStringGetCString(stringRef, buffer, maxSize, kCFStringEncodingUTF8)) {
                    step.text = std::string(buffer);
                }
                delete[] buffer;
            }
            CFRelease(stringRef);
        }
    }
    
    // Handle modifier keys
    step.modifiers.shift = (flags & kCGEventFlagMaskShift) != 0;
    step.modifiers.control = (flags & kCGEventFlagMaskControl) != 0;
    step.modifiers.option = (flags & kCGEventFlagMaskAlternate) != 0;
    step.modifiers.command = (flags & kCGEventFlagMaskCommand) != 0;
    
    // Get focused element for typing events
    AXUIElementRef focusedElement = getFocusedElement();
    if (focusedElement) {
        AXElementInfo elementInfo;
        elementInfo.setElement(focusedElement);
        
        step.targetDescriptor.role = elementInfo.getStringAttribute(kAXRoleAttribute);
        step.targetDescriptor.title = elementInfo.getStringAttribute(kAXTitleAttribute);
        step.targetDescriptor.identifier = elementInfo.getStringAttribute(kAXIdentifierAttribute);
        step.targetDescriptor.value = elementInfo.getStringAttribute(kAXValueAttribute);
        step.targetDescriptor.ancestry = elementInfo.getAncestryPath();
        
        CGRect frame = elementInfo.getFrame();
        step.targetDescriptor.frame = {
            static_cast<int>(frame.origin.x),
            static_cast<int>(frame.origin.y),
            static_cast<int>(frame.size.width),
            static_cast<int>(frame.size.height)
        };
        
        CFRelease(focusedElement);
    }
    
    step.appInfo = getCurrentApplication();
    stepCallback(step);
    
    return event;
}

AXUIElementRef EventMonitor::getFocusedElement() {
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    if (!systemWideElement) {
        return nullptr;
    }
    
    AXUIElementRef focusedApp = nullptr;
    AXError error = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute, reinterpret_cast<CFTypeRef*>(&focusedApp));
    
    CFRelease(systemWideElement);
    
    if (error != kAXErrorSuccess || !focusedApp) {
        return nullptr;
    }
    
    AXUIElementRef focusedElement = nullptr;
    error = AXUIElementCopyAttributeValue(focusedApp, kAXFocusedUIElementAttribute, reinterpret_cast<CFTypeRef*>(&focusedElement));
    
    CFRelease(focusedApp);
    
    if (error == kAXErrorSuccess && focusedElement) {
        return focusedElement;
    }
    
    return nullptr;
}

ApplicationInfo EventMonitor::getCurrentApplication() {
    ApplicationInfo appInfo;
    
    ProcessSerialNumber psn;
    GetFrontProcess(&psn);
    
    CFStringRef appName = nullptr;
    CopyProcessName(&psn, &appName);
    
    if (appName) {
        const char* cString = CFStringGetCStringPtr(appName, kCFStringEncodingUTF8);
        if (cString) {
            appInfo.name = std::string(cString);
        } else {
            CFIndex length = CFStringGetLength(appName);
            CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
            char* buffer = new char[maxSize];
            if (CFStringGetCString(appName, buffer, maxSize, kCFStringEncodingUTF8)) {
                appInfo.name = std::string(buffer);
            }
            delete[] buffer;
        }
        CFRelease(appName);
    }
    
    pid_t pid;
    GetProcessPID(&psn, &pid);
    appInfo.processId = static_cast<int>(pid);
    
    return appInfo;
}