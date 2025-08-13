#include <napi.h>
#include "event_monitor.h"
#include <iostream>
#include <queue>
#include <mutex>

class AXRecorder : public Napi::ObjectWrap<AXRecorder> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    AXRecorder(const Napi::CallbackInfo& info);
    
    Napi::Value StartRecording(const Napi::CallbackInfo& info);
    Napi::Value StopRecording(const Napi::CallbackInfo& info);
    Napi::Value IsRecording(const Napi::CallbackInfo& info);
    Napi::Value GetRecordedSteps(const Napi::CallbackInfo& info);
    Napi::Value ClearSteps(const Napi::CallbackInfo& info);

private:
    void OnStepRecorded(const RecordedStep& step);
    Napi::Object RecordedStepToJS(Napi::Env env, const RecordedStep& step);
    
    std::queue<RecordedStep> recordedSteps;
    std::mutex stepsMutex;
    EventMonitor* monitor;
};

Napi::Object AXRecorder::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "AXRecorder", {
        InstanceMethod("startRecording", &AXRecorder::StartRecording),
        InstanceMethod("stopRecording", &AXRecorder::StopRecording),
        InstanceMethod("isRecording", &AXRecorder::IsRecording),
        InstanceMethod("getRecordedSteps", &AXRecorder::GetRecordedSteps),
        InstanceMethod("clearSteps", &AXRecorder::ClearSteps)
    });
    
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);
    
    exports.Set("AXRecorder", func);
    return exports;
}

AXRecorder::AXRecorder(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AXRecorder>(info) {
    monitor = EventMonitor::getInstance();
    
    // Set up callback for recorded steps
    monitor->setStepCallback([this](const RecordedStep& step) {
        this->OnStepRecorded(step);
    });
}

Napi::Value AXRecorder::StartRecording(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Session ID string expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string sessionId = info[0].As<Napi::String>().Utf8Value();
    
    bool success = monitor->startRecording(sessionId);
    return Napi::Boolean::New(env, success);
}

Napi::Value AXRecorder::StopRecording(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    monitor->stopRecording();
    return Napi::Boolean::New(env, true);
}

Napi::Value AXRecorder::IsRecording(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    return Napi::Boolean::New(env, monitor->isRecordingActive());
}

Napi::Value AXRecorder::GetRecordedSteps(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    std::lock_guard<std::mutex> lock(stepsMutex);
    
    std::cout << "GetRecordedSteps called, queue size: " << recordedSteps.size() << std::endl;
    
    Napi::Array steps = Napi::Array::New(env, recordedSteps.size());
    size_t index = 0;
    
    std::queue<RecordedStep> tempQueue = recordedSteps;
    while (!tempQueue.empty()) {
        steps[index++] = RecordedStepToJS(env, tempQueue.front());
        tempQueue.pop();
    }
    
    std::cout << "Returning " << index << " steps to JavaScript" << std::endl;
    return steps;
}

Napi::Value AXRecorder::ClearSteps(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    std::lock_guard<std::mutex> lock(stepsMutex);
    
    // Clear the queue
    std::queue<RecordedStep> emptyQueue;
    recordedSteps.swap(emptyQueue);
    
    return Napi::Boolean::New(env, true);
}

void AXRecorder::OnStepRecorded(const RecordedStep& step) {
    std::cout << "OnStepRecorded called with action: " << step.action << std::endl;
    std::lock_guard<std::mutex> lock(stepsMutex);
    recordedSteps.push(step);
    std::cout << "Step added to queue, queue size now: " << recordedSteps.size() << std::endl;
}

Napi::Object AXRecorder::RecordedStepToJS(Napi::Env env, const RecordedStep& step) {
    Napi::Object obj = Napi::Object::New(env);
    
    obj.Set("timestamp", Napi::Number::New(env, step.timestamp));
    obj.Set("sessionId", Napi::String::New(env, step.sessionId));
    obj.Set("action", Napi::String::New(env, step.action));
    
    if (!step.button.empty()) {
        obj.Set("button", Napi::String::New(env, step.button));
    }
    
    if (!step.text.empty()) {
        obj.Set("text", Napi::String::New(env, step.text));
    }
    
    Napi::Object location = Napi::Object::New(env);
    location.Set("x", Napi::Number::New(env, step.location.x));
    location.Set("y", Napi::Number::New(env, step.location.y));
    obj.Set("location", location);
    
    Napi::Object modifiers = Napi::Object::New(env);
    modifiers.Set("shift", Napi::Boolean::New(env, step.modifiers.shift));
    modifiers.Set("control", Napi::Boolean::New(env, step.modifiers.control));
    modifiers.Set("option", Napi::Boolean::New(env, step.modifiers.option));
    modifiers.Set("command", Napi::Boolean::New(env, step.modifiers.command));
    obj.Set("modifiers", modifiers);
    
    Napi::Object target = Napi::Object::New(env);
    target.Set("role", Napi::String::New(env, step.targetDescriptor.role));
    target.Set("title", Napi::String::New(env, step.targetDescriptor.title));
    target.Set("identifier", Napi::String::New(env, step.targetDescriptor.identifier));
    target.Set("value", Napi::String::New(env, step.targetDescriptor.value));
    
    Napi::Object frame = Napi::Object::New(env);
    frame.Set("x", Napi::Number::New(env, step.targetDescriptor.frame.x));
    frame.Set("y", Napi::Number::New(env, step.targetDescriptor.frame.y));
    frame.Set("width", Napi::Number::New(env, step.targetDescriptor.frame.width));
    frame.Set("height", Napi::Number::New(env, step.targetDescriptor.frame.height));
    target.Set("frame", frame);
    
    Napi::Array ancestry = Napi::Array::New(env, step.targetDescriptor.ancestry.size());
    for (size_t i = 0; i < step.targetDescriptor.ancestry.size(); i++) {
        ancestry[i] = Napi::String::New(env, step.targetDescriptor.ancestry[i]);
    }
    target.Set("ancestry", ancestry);
    obj.Set("targetDescriptor", target);
    
    Napi::Object appInfo = Napi::Object::New(env);
    appInfo.Set("name", Napi::String::New(env, step.appInfo.name));
    appInfo.Set("processId", Napi::Number::New(env, step.appInfo.processId));
    obj.Set("appInfo", appInfo);
    
    return obj;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return AXRecorder::Init(env, exports);
}

NODE_API_MODULE(ax_recorder, Init)