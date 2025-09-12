import type React from "react"

interface StepsSectionProps {
  isVisible: boolean
}

export default function StepsSection({ isVisible }: StepsSectionProps) {
  const steps = [
    {
      number: 1,
      title: "간단 촬영",
      description: "머리 부분만 촬영하여 업로드",
      delay: "delay-100"
    },
    {
      number: 2,
      title: "AI 분석",
      description: "30초만에 탈모 상태 분석",    
      delay: "delay-200"
    },
    {
      number: 3,
      title: "맞춤 솔루션",
      description: "개인별 최적화된 솔루션 및 컨텐츠 제공",
      delay: "delay-300"
    }
  ]

  return (
    <div className="min-h-screen md:h-screen flex items-center justify-center px-4 bg-black/5 relative z-10">
      <div className="container mx-auto max-w-4xl">
        <div
          className={`text-center mb-8 md:mb-12 transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">간단한 3단계로 완료</h3>
          <p className="text-lg md:text-xl text-gray-700">복잡한 절차 없이 간단하게 시작하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`text-center transition-all duration-1000 ease-out ${step.delay} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="relative mb-6">
                <div
                  className="h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center mx-auto text-white font-bold text-xl md:text-2xl"
                  style={{ backgroundColor: "rgb(0,115,255)" }}
                >
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gray-300 transform -translate-y-1/2 -translate-x-1/2"></div>
                )}
              </div>
              <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">{step.title}</h4>
              <p className="text-gray-700 text-sm md:text-base">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
