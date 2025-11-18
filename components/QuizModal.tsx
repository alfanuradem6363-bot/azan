import React, { useState, useEffect, useCallback } from 'react';
import type { MathQuestion } from '../types';

interface QuizModalProps {
  numQuestions: number;
  onComplete: () => void;
}

const generateQuestion = (): MathQuestion => {
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let num1: number;
    let num2: number;
    let answer: number;
    let questionText: string;

    switch (operator) {
        case '+':
            answer = Math.floor(Math.random() * 19) + 2; // answer is between 2 and 20
            num1 = Math.floor(Math.random() * (answer - 1)) + 1;
            num2 = answer - num1;
            questionText = `${num1} + ${num2}`;
            break;
        case '-':
            num1 = Math.floor(Math.random() * 19) + 2; // num1 is between 2 and 20
            num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
            answer = num1 - num2;
            questionText = `${num1} - ${num2}`;
            break;
        case '*':
            do {
                num1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
                num2 = Math.floor(Math.random() * 9) + 2; // 2 to 10
            } while (num1 * num2 > 20);
            answer = num1 * num2;
            questionText = `${num1} × ${num2}`;
            break;
        default:
            answer = 1;
            num1 = 1;
            num2 = 0;
            questionText = '1 + 0';
    }

    return { question: questionText, answer };
};

const KeypadButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string }> = ({ onClick, children, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        className={`bg-white/10 backdrop-blur-sm rounded-full aspect-square flex items-center justify-center text-3xl font-light text-white transition-colors hover:bg-white/20 active:bg-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}
    >
        {children}
    </button>
);

export const QuizModal: React.FC<QuizModalProps> = ({ numQuestions, onComplete }) => {
  const [questions, setQuestions] = useState<MathQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newQuestions = Array.from({ length: numQuestions }, generateQuestion);
    setQuestions(newQuestions);
  }, [numQuestions]);

  const handleKeyPress = (key: string) => {
    setError(null);
    if (userAnswer.length < 3) {
      setUserAnswer(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    setError(null);
    setUserAnswer(prev => prev.slice(0, -1));
  };
  
  const handleSubmit = useCallback(() => {
    if (userAnswer.trim() === '') return;

    if (parseInt(userAnswer, 10) === questions[currentQuestionIndex].answer) {
      if (currentQuestionIndex < numQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer('');
        setError(null);
      } else {
        onComplete();
      }
    } else {
      setError('Wrong answer. Try again!');
      setUserAnswer('');
    }
  }, [userAnswer, questions, currentQuestionIndex, numQuestions, onComplete]);

  // Allow keyboard input for convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key >= '0' && e.key <= '9') {
            handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
            handleBackspace();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);


  if (questions.length === 0) {
    return null; // Don't render until questions are generated
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-between z-50 p-6 md:p-8 font-sans">
      <header className="text-center w-full animate-pulse">
        <h2 className="text-2xl font-bold text-orange-400">Time to Wake Up!</h2>
        <p className="text-slate-300 mt-1">Question {currentQuestionIndex + 1} of {numQuestions}</p>
      </header>
      
      <main className="flex flex-col items-center justify-center w-full">
          <div className="text-6xl md:text-8xl font-display text-white mb-4">
              {currentQuestion.question} = ?
          </div>
          <div className="h-12 text-5xl font-mono tracking-widest text-center w-full min-h-[3rem] text-slate-300">
              {userAnswer || <span className="opacity-50">...</span>}
          </div>
          {error && <p className="text-red-400 mt-2 h-6">{error}</p>}
      </main>

      <footer className="w-full max-w-xs">
          <div className="grid grid-cols-3 gap-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                  <KeypadButton key={digit} onClick={() => handleKeyPress(digit)}>
                      {digit}
                  </KeypadButton>
              ))}
              <KeypadButton onClick={handleBackspace}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                  </svg>
              </KeypadButton>
              <KeypadButton onClick={() => handleKeyPress('0')}>
                  0
              </KeypadButton>
              <KeypadButton onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 active:bg-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
              </KeypadButton>
          </div>
      </footer>
    </div>
  );
};
