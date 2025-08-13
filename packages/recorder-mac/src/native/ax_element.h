#pragma once

#include <napi.h>
#include <ApplicationServices/ApplicationServices.h>
#include <string>
#include <vector>

class AXElementInfo {
public:
    AXElementInfo();
    ~AXElementInfo();
    
    void setElement(AXUIElementRef elem) {
        if (element) {
            CFRelease(element);
        }
        element = elem;
        if (element) {
            CFRetain(element);
        }
    }
    
    std::string getStringAttribute(CFStringRef attribute);
    CGRect getFrame();
    std::vector<std::string> getAncestryPath();
    
    static AXUIElementRef getElementAtPoint(CGPoint point);
    static std::string getStringAttributeForElement(AXUIElementRef elem, CFStringRef attribute);
    
    Napi::Object toJSON(Napi::Env env);
    
private:
    AXUIElementRef element;
};