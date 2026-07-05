import React, { useState, useEffect } from 'react';

export default function LoadingIntro({ onDone, agentStates, counters, scraperLog }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState([0]);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Step names
  const steps = [
    { key: 'scraping', text: 'Data Acquisition...', dynamic: true },
    { key: 'activated', text: 'MergeN Core Activated', accent: true },
  ];

  useEffect(() => {
    const isResearchDone = agentStates.research === 'done' || agentStates.xray !== 'idle';
    
    if (stepIndex === 0 && !isResearchDone) {
      return; // Still researching, waiting honestly!
    }

    // When research is actually done, tick the scraping step and move to activated
    if (isResearchDone) {
      if (stepIndex === 0) {
        setCompletedSteps(c => [...c, 0]);
        const timer = setTimeout(() => {
          setStepIndex(1);
          setVisibleSteps(v => [...v, 1]);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [stepIndex, agentStates.research, agentStates.xray]);

  useEffect(() => {
    if (stepIndex === 1) {
      const timer = setTimeout(() => {
        onDone();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [stepIndex, onDone]);

  return (
    <div className="loading-intro">
      <div className="loading-intro-inner">
        {/* Dynamic status label at the top */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--accent)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 24,
          opacity: 0.8
        }}>
          {stepIndex < 3 ? 'REAL-TIME DATA ACQUISITION IN PROGRESS' : 'CORE PIPELINE INITIALIZED'}
        </div>

        <div className="loading-intro-lines">
          {steps.map((step, i) => {
            const isVisible = visibleSteps.includes(i);
            const isCompleted = completedSteps.includes(i);
            const isActive = stepIndex === i;

            if (!isVisible) return null;

            return (
              <div
                key={step.key}
                className={`loading-intro-line loading-intro-line--visible ${
                  step.accent ? 'loading-intro-line--accent' : ''
                } ${isActive ? 'loading-intro-line--active' : ''}`}
              >
                {step.accent ? (
                  <>
                    <span className="pip pip-good pip-glow" style={{ marginRight: 10 }} />
                    <span className="loading-text-glow">{step.text}</span>
                  </>
                ) : (
                  <>
                    {isCompleted ? (
                      <span className="loading-intro-check">✓</span>
                    ) : (
                      <span className="loading-intro-dot loading-intro-dot--pulsing" />
                    )}
                    <span style={{ opacity: isCompleted ? 0.6 : 1 }}>
                      {step.dynamic && scraperLog ? (
                         <span>Scraping Sources... <span style={{ color: 'var(--fg-mute)', fontSize: 12, marginLeft: 8 }}>{scraperLog}</span></span>
                      ) : (
                         step.text
                      )}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
