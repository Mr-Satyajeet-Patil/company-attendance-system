import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  UserCheck,
  Clock,
  Maximize2,
  Scan,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';
import { soundManager } from '../utils/audio';
import { KioskPunchResponse, LivePunchItem } from '../types';

interface KioskViewProps {
  onRefreshDashboard?: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({ onRefreshDashboard }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [punchResult, setPunchResult] = useState<KioskPunchResponse | null>(null);
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentLivePunches, setRecentLivePunches] = useState<LivePunchItem[]>([]);
  const lastPunchTimestampRef = useRef<number>(0);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      setStreamError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamActive(true);
        };
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setStreamError(
        'Unable to access camera. Please allow camera permissions in your browser or connect a webcam device.'
      );
      setStreamActive(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture Frame and send to Biometric Engine
  const captureAndPunch = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    // In auto-mode, enforce a 6-second cooldown after any punch before scanning again
    if (autoMode && Date.now() - lastPunchTimestampRef.current < 6000) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsProcessing(true);
    setPunchResult(null);

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.92);

      if (soundEnabled) {
        soundManager.playShutter();
      }

      const result = await api.punchAttendance(base64Data);
      setPunchResult(result);

      if (result.matched && result.success) {
        lastPunchTimestampRef.current = Date.now();

        if (soundEnabled) {
          if (result.punch_type === 'CHECK_IN') {
            soundManager.playSuccessCheckIn();
          } else if (result.punch_type === 'CHECK_OUT') {
            soundManager.playSuccessCheckOut();
          } else {
            soundManager.playWarning();
          }
        }

        // Add to recent live punches
        if (result.employee && result.record) {
          const newPunch: LivePunchItem = {
            id: Date.now(),
            employee_name: result.employee.name,
            employee_id: result.employee.employee_id,
            department: result.employee.department,
            face_image: result.employee.face_image,
            check_in: result.record.check_in,
            check_out: result.record.check_out,
            status: result.record.status,
            confidence: result.confidence || 98.5,
            work_hours: result.record.work_hours || 0,
          };
          setRecentLivePunches((prev) => [newPunch, ...prev.slice(0, 9)]);
        }

        if (onRefreshDashboard) onRefreshDashboard();
      } else {
        if (soundEnabled) {
          soundManager.playWarning();
        }
      }
    } catch (e: unknown) {
      console.error('Punch error:', e);
      setPunchResult({
        success: false,
        matched: false,
        message: 'Network or server communication error. Please try again.',
      });
      if (soundEnabled) soundManager.playWarning();
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, soundEnabled, onRefreshDashboard]);

  // Auto scan interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoMode && streamActive) {
      interval = setInterval(() => {
        if (!isProcessing) {
          captureAndPunch();
        }
      }, 4500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoMode, streamActive, isProcessing, captureAndPunch]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>High-Accuracy Facial Recognition Terminal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            PulseAttend <span className="text-indigo-400">360°</span> Biometric Kiosk
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Position your face within the scanner frame. The system uses multi-angle embedding vector matching with sub-second verification.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl border transition-all ${
              soundEnabled
                ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
              autoMode
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>{autoMode ? 'Auto-Scan Active (4s)' : 'Manual Punch Mode'}</span>
          </button>

          <button
            onClick={startCamera}
            className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Restart Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Kiosk Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Camera Terminal (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[16/10] shadow-2xl flex items-center justify-center group">
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Hidden canvas used for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Futuristic HUD Scanning Overlay */}
            {streamActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                {/* Outer Target Box */}
                <div className="relative w-72 h-80 sm:w-80 sm:h-96 rounded-3xl border-2 border-indigo-500/40 glow-card flex items-center justify-center">
                  {/* Target Corners */}
                  <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />

                  {/* Horizontal scanning light beam */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline shadow-[0_0_15px_#22d3ee]" />

                  {/* Center reticle */}
                  <div className="w-16 h-16 rounded-full border border-indigo-400/40 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  </div>
                </div>

                {/* HUD Top Info */}
                <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>BIOMETRIC FEED // 1280x720</span>
                </div>

                <div className="absolute top-6 right-6 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300">
                  FACENET-512 MULTI-ANGLE
                </div>

                {/* HUD Bottom prompt */}
                <div className="absolute bottom-6 px-4 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Align your face with the guides and press Punch</span>
                </div>
              </div>
            )}

            {/* Error or Loading State */}
            {streamError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-white">Camera Access Required</h3>
                <p className="text-sm text-slate-400 max-w-md">{streamError}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
                >
                  Retry Camera
                </button>
              </div>
            )}

            {!streamActive && !streamError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm">Initializing high-definition biometric camera...</p>
              </div>
            )}
          </div>

          {/* Punch Button Bar */}
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={captureAndPunch}
              disabled={!streamActive || isProcessing}
              className={`w-full max-w-md py-4 px-8 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-xl ${
                isProcessing
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-300" />
                  <span>Analyzing Biometric Embeddings...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>VERIFY FACE & PUNCH ATTENDANCE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status & Feedback Panel (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Punch Result Card */}
          {punchResult && (
            <div
              className={`p-6 rounded-3xl border transition-all duration-300 animate-in fade-in zoom-in-95 ${
                punchResult.matched
                  ? 'bg-gradient-to-b from-slate-900 to-indigo-950/40 border-indigo-500/40 shadow-2xl shadow-indigo-950/50'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {punchResult.matched ? (
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {punchResult.matched
                        ? punchResult.punch_type === 'CHECK_IN'
                          ? 'Check-In Verified'
                          : punchResult.punch_type === 'ALREADY_RECORDED'
                          ? 'Already Logged In'
                          : 'Check-Out Recorded'
                        : 'Verification Failed'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {punchResult.matched ? 'Multi-Angle Match Confirmed' : 'No Match Found'}
                    </p>
                  </div>
                </div>

                {punchResult.confidence && punchResult.confidence > 0 && (
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {punchResult.confidence}% Match
                  </span>
                )}
              </div>

              {punchResult.matched && punchResult.employee && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-4 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
                    {punchResult.employee.face_image ? (
                      <img
                        src={punchResult.employee.face_image}
                        alt={punchResult.employee.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/40"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-lg">
                        {punchResult.employee.name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-white text-base truncate">
                        {punchResult.employee.name}
                      </h5>
                      <p className="text-xs text-slate-400 truncate">
                        {punchResult.employee.designation} &bull; {punchResult.employee.department}
                      </p>
                      <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                        ID: {punchResult.employee.employee_id}
                      </span>
                    </div>
                  </div>

                  {punchResult.record && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Punch Time
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-white">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{punchResult.record.check_in || punchResult.record.check_out}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Attendance Status
                        </span>
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                            punchResult.record.status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : punchResult.record.status === 'Late'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {punchResult.record.status}
                        </span>
                      </div>

                      {punchResult.record.work_hours > 0 && (
                        <div className="col-span-2 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Total Work Duration Today:</span>
                          <span className="text-sm font-mono font-bold text-indigo-300">
                            {punchResult.record.work_hours} hours
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/50">
                    {punchResult.message}
                  </p>
                </div>
              )}

              {!punchResult.matched && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{punchResult.message}</p>
                  <p className="text-[11px] text-slate-400">
                    Tip: Look directly at the camera, avoid harsh backlighting, or register multi-shot photos in Employee Directory.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Real-Time Feed */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">Session Punches</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {recentLivePunches.length} punch(es)
              </span>
            </div>

            {recentLivePunches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Camera className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No punches in this session yet.</p>
                <p className="text-[11px] text-slate-400">Punches will appear here with live confidence metrics.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {recentLivePunches.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {item.face_image ? (
                        <img
                          src={item.face_image}
                          alt={item.employee_name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                          {item.employee_name[0]}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block truncate max-w-[120px]">
                          {item.employee_name}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.department}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-slate-300 font-semibold block">
                        {item.check_out || item.check_in}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          item.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {item.status} ({item.confidence}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
