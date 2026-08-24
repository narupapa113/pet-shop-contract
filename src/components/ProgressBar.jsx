import React from "react";
import { FileText } from "lucide-react";
import { STEP_TYPES } from "../constants";

const ProgressBar = ({ steps, currentStepIndex }) => (
  <div className="w-full bg-white shadow-sm py-4 px-4 mb-6 print:hidden">
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap justify-center items-start gap-y-3">
        {steps.map((step, index) => {
          const stepTypeInfo = STEP_TYPES[step.type] || { icon: FileText };
          const Icon = stepTypeInfo.icon;
          const isActive = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex flex-col items-center min-w-[64px] px-2 ${isActive ? "text-blue-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${isActive ? "bg-blue-100" : "bg-gray-100"} ${isCurrent ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
                >
                  <Icon size={16} />
                </div>
                <span className="text-xs font-bold whitespace-nowrap">
                  {stepTypeInfo.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 min-w-[16px] h-1 bg-gray-200 mx-1 relative mt-4">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
                    style={{ width: index < currentStepIndex ? "100%" : "0%" }}
                  ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </div>
);

export default ProgressBar;
