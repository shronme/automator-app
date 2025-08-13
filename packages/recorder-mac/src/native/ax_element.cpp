#include "ax_element.h"
#include <ApplicationServices/ApplicationServices.h>
#include <iostream>

AXElementInfo::AXElementInfo() : element(nullptr) {}

AXElementInfo::~AXElementInfo() {
    if (element) {
        CFRelease(element);
    }
}

std::string AXElementInfo::getStringAttribute(CFStringRef attribute) {
    if (!element) return "";
    
    CFTypeRef value = nullptr;
    AXError error = AXUIElementCopyAttributeValue(element, attribute, &value);
    
    if (error != kAXErrorSuccess || !value) {
        return "";
    }
    
    std::string result;
    if (CFGetTypeID(value) == CFStringGetTypeID()) {
        CFStringRef str = static_cast<CFStringRef>(value);
        const char* cStr = CFStringGetCStringPtr(str, kCFStringEncodingUTF8);
        
        if (cStr) {
            result = std::string(cStr);
        } else {
            CFIndex length = CFStringGetLength(str);
            CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
            char* buffer = new char[maxSize];
            
            if (CFStringGetCString(str, buffer, maxSize, kCFStringEncodingUTF8)) {
                result = std::string(buffer);
            }
            
            delete[] buffer;
        }
    }
    
    CFRelease(value);
    return result;
}

CGRect AXElementInfo::getFrame() {
    CGRect frame = CGRectZero;
    
    if (!element) return frame;
    
    CFTypeRef positionValue = nullptr;
    CFTypeRef sizeValue = nullptr;
    
    AXError posError = AXUIElementCopyAttributeValue(element, kAXPositionAttribute, &positionValue);
    AXError sizeError = AXUIElementCopyAttributeValue(element, kAXSizeAttribute, &sizeValue);
    
    if (posError == kAXErrorSuccess && sizeError == kAXErrorSuccess && 
        positionValue && sizeValue) {
        
        CGPoint position;
        CGSize size;
        
        if (AXValueGetValue(static_cast<AXValueRef>(positionValue), kAXValueTypeCGPoint, &position) &&
            AXValueGetValue(static_cast<AXValueRef>(sizeValue), kAXValueTypeCGSize, &size)) {
            
            frame = CGRectMake(position.x, position.y, size.width, size.height);
        }
    }
    
    if (positionValue) CFRelease(positionValue);
    if (sizeValue) CFRelease(sizeValue);
    
    return frame;
}

std::vector<std::string> AXElementInfo::getAncestryPath() {
    std::vector<std::string> path;
    
    if (!element) return path;
    
    AXUIElementRef current = element;
    CFRetain(current);
    
    while (current) {
        std::string role = getStringAttributeForElement(current, kAXRoleAttribute);
        std::string title = getStringAttributeForElement(current, kAXTitleAttribute);
        std::string identifier = getStringAttributeForElement(current, kAXIdentifierAttribute);
        
        std::string pathComponent = role;
        if (!title.empty()) {
            pathComponent += "[title=\"" + title + "\"]";
        }
        if (!identifier.empty()) {
            pathComponent += "[id=\"" + identifier + "\"]";
        }
        
        path.insert(path.begin(), pathComponent);
        
        CFTypeRef parentValue = nullptr;
        AXError error = AXUIElementCopyAttributeValue(current, kAXParentAttribute, &parentValue);
        
        CFRelease(current);
        current = nullptr;
        
        if (error == kAXErrorSuccess && parentValue) {
            current = static_cast<AXUIElementRef>(parentValue);
        }
    }
    
    return path;
}

std::string AXElementInfo::getStringAttributeForElement(AXUIElementRef elem, CFStringRef attribute) {
    if (!elem) return "";
    
    CFTypeRef value = nullptr;
    AXError error = AXUIElementCopyAttributeValue(elem, attribute, &value);
    
    if (error != kAXErrorSuccess || !value) {
        return "";
    }
    
    std::string result;
    if (CFGetTypeID(value) == CFStringGetTypeID()) {
        CFStringRef str = static_cast<CFStringRef>(value);
        const char* cStr = CFStringGetCStringPtr(str, kCFStringEncodingUTF8);
        
        if (cStr) {
            result = std::string(cStr);
        } else {
            CFIndex length = CFStringGetLength(str);
            CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
            char* buffer = new char[maxSize];
            
            if (CFStringGetCString(str, buffer, maxSize, kCFStringEncodingUTF8)) {
                result = std::string(buffer);
            }
            
            delete[] buffer;
        }
    }
    
    CFRelease(value);
    return result;
}

AXUIElementRef AXElementInfo::getElementAtPoint(CGPoint point) {
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    if (!systemWideElement) {
        return nullptr;
    }
    
    AXUIElementRef element = nullptr;
    AXError error = AXUIElementCopyElementAtPosition(systemWideElement, point.x, point.y, &element);
    
    CFRelease(systemWideElement);
    
    if (error == kAXErrorSuccess && element) {
        return element;
    }
    
    return nullptr;
}

Napi::Object AXElementInfo::toJSON(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);
    
    obj.Set("role", getStringAttribute(kAXRoleAttribute));
    obj.Set("subrole", getStringAttribute(kAXSubroleAttribute));
    obj.Set("title", getStringAttribute(kAXTitleAttribute));
    obj.Set("identifier", getStringAttribute(kAXIdentifierAttribute));
    obj.Set("value", getStringAttribute(kAXValueAttribute));
    obj.Set("description", getStringAttribute(kAXDescriptionAttribute));
    
    CGRect frame = getFrame();
    Napi::Object frameObj = Napi::Object::New(env);
    frameObj.Set("x", frame.origin.x);
    frameObj.Set("y", frame.origin.y);
    frameObj.Set("width", frame.size.width);
    frameObj.Set("height", frame.size.height);
    obj.Set("frame", frameObj);
    
    std::vector<std::string> ancestry = getAncestryPath();
    Napi::Array ancestryArray = Napi::Array::New(env, ancestry.size());
    for (size_t i = 0; i < ancestry.size(); i++) {
        ancestryArray[i] = Napi::String::New(env, ancestry[i]);
    }
    obj.Set("ancestry", ancestryArray);
    
    return obj;
}