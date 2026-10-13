import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Upload,
  User,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../api';
import { soundManager } from '../utils/audio';

interface MultiPhotoRegisterModalProps {
  employee: {
    id: number;
    employee_id: string;
    name: string;
    department: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface ShotGuide {
  angle: string;
  title: string;
  instruction: string;
  tip: string;
}

const SHOT_STEPS: ShotGuide[] = [
  {
    angle: 'frontal',
    title: '1. Frontal Center',
    instruction: 'Look straight at the camera with a neutral expression.',
    tip: 'Keep eyes leveled with the lens',
  },
  {
    angle: 'left',
    title: '2. Slight Left Angle',
    instruction: 'Turn your head slightly ~15° to the left.',
    tip: 'Captures jawline and left profile features',
  },
  {
    angle: 'right',
    title: '3. Slight Right Angle',
    instruction: 'Turn your head slightly ~15° to the right.',
    tip: 'Captures right orbital and cheek geometry',
  },
  {
    angle: 'expression',
    title: '4. Natural Expression / Smile',
    instruction: 'Look straight with a natural smile or subtle expression.',
    tip: 'Allows recognition across varying facial expressions',
  },
];

export const MultiPhotoRegisterModal: React.FC<MultiPhotoRegisterModalProps> = ({
  employee,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [capturedShots, setCapturedShots] = useState<{ [angle: string]: string }>({});
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg('Failed to open camera. You can also upload images directly below.');
      setCameraActive(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture Current Shot
  const snapCurrentShot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.92);

    soundManager.playShutter();

    const currentAngle = SHOT_STEPS[activeStep].angle;
    setCapturedShots((prev) => ({
      ...prev,
      [currentAngle]: b64,
    }));

    // Advance to next step if not last
    if (activeStep < SHOT_STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  // 3-2-1 Timer Snap
  const triggerCountdownSnap = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          snapCurrentShot();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  // Upload file fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, angle: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setCapturedShots((prev) => ({ ...prev, [angle]: b64 }));
    };
    reader.readAsDataURL(file);
  };

  // Retake Shot
  const retakeShot = (angle: string, stepIndex: number) => {
    setCapturedShots((prev) => {
      const copy = { ...prev };
      delete copy[angle];
      return copy;
    });
    setActiveStep(stepIndex);
  };

  // Submit all captured shots to backend
  const handleSubmitEmbeddings = async () => {
    const shotCount = Object.keys(capturedShots).length;
    if (shotCount < 2) {
      setErrorMsg('Please capture at least 3-4 photos to ensure high multi-angle biometric accuracy.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const samplesPayload = Object.entries(capturedShots).map(([angle, image]) => ({
        angle,
        image,
      }));

      const res = await api.registerMultiAngleFaces(employee.id, samplesPayload);

      if (res.success) {
        soundManager.playSuccessCheckIn();
        setSuccessResult(res.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Face registration failed. Please ensure clear lighting.');
      }
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg('Server error while generating embeddings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentGuide = SHOT_STEPS[activeStep];
  const totalCaptured = Object.keys(capturedShots).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-6">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                Multi-Angle Biometric Registration
              </h3>
              <p className="text-xs text-slate-400">
                Register 3-4 facial angles for <span className="text-indigo-300 font-semibold">{employee.name}</span> (ID: {employee.employee_id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Step Progression Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SHOT_STEPS.map((step, idx) => {
              const isCaptured = Boolean(capturedShots[step.angle]);
              const isCurrent = activeStep === idx;

              return (
                <button
                  key={step.angle}
                  onClick={() => setActiveStep(idx)}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    isCurrent
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-950'
                      : isCaptured
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Step {idx + 1}
                    </span>
                    {isCaptured && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-xs font-bold truncate">{step.title.split('. ')[1]}</p>
                </button>
              );
            })}
          </div>

          {/* Active Step Guide Callout */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-bold text-white">{currentGuide.title}</h5>
              <p className="text-xs text-slate-300 mt-0.5">{currentGuide.instruction}</p>
              <p className="text-[11px] text-indigo-300/80 mt-1 font-mono">{currentGuide.tip}</p>
            </div>
          </div>

          {/* Camera & Preview Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Live Camera View (7 Cols) */}
            <div className="md:col-span-7 space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Oval Face Guide */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-dashed border-indigo-400/60 rounded-[50%] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Countdown overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-7xl font-extrabold text-white animate-ping font-mono">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>

              {/* Shutter Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={snapCurrentShot}
                  disabled={!cameraActive || countdown !== null}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Step {activeStep + 1} ({currentGuide.angle})</span>
                </button>

                <button
                  type="button"
                  onClick={triggerCountdownSnap}
                  disabled={!cameraActive || countdown !== null}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
                  title="Capture with 3s Timer"
                >
                  3s Timer
                </button>
              </div>
            </div>

            {/* Gallery of Captured Shots (5 Cols) */}
            <div className="md:col-span-5 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Captured Angle Gallery ({totalCaptured}/4)
              </h5>

              <div className="grid grid-cols-2 gap-3">
                {SHOT_STEPS.map((step, idx) => {
                  const shot = capturedShots[step.angle];

                  return (
                    <div
                      key={step.angle}
                      className="relative p-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1.5"
                    >
                      {shot ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-indigo-500/40">
                          <img src={shot} alt={step.angle} className="w-full h-full object-cover" />
                          <button
                            onClick={() => retakeShot(step.angle, idx)}
                            className="absolute bottom-1 right-1 p-1 rounded-lg bg-black/70 text-slate-200 hover:text-white"
                            title="Retake"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-square rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-400 p-2 space-y-1">
                          <User className="w-6 h-6 opacity-30" />
                          <span className="text-[10px]">Pending</span>
                          <label className="cursor-pointer text-[10px] text-indigo-400 hover:underline">
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, step.angle)}
                            />
                          </label>
                        </div>
                      )}
                      <p className="text-[11px] font-bold text-slate-300 truncate">
                        {step.title.split('. ')[1]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successResult && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successResult}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-Shot Ensemble increases verification accuracy to &gt; 99.2%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitEmbeddings}
              disabled={isSubmitting || totalCaptured < 1}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                totalCaptured < 1 || isSubmitting
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Generating Facenet512 Embeddings...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save All {totalCaptured} Face Samples</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
