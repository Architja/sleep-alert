import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { CameraOff, AlertTriangle } from 'lucide-react';

// Points for eyes based on MediaPipe Face Mesh
// Left eye: 362 (left), 385 (top), 387 (top), 263 (right), 373 (bottom), 380 (bottom)
// Right eye: 33 (left), 160 (top), 158 (top), 133 (right), 144 (bottom), 153 (bottom)

const calculateEAR = (landmarks: any[], eyeIndices: number[]) => {
  if (!landmarks || landmarks.length === 0) return 0;
  
  const p1 = landmarks[eyeIndices[0]]; // left
  const p2 = landmarks[eyeIndices[1]]; // top
  const p3 = landmarks[eyeIndices[2]]; // top
  const p4 = landmarks[eyeIndices[3]]; // right
  const p5 = landmarks[eyeIndices[4]]; // bottom
  const p6 = landmarks[eyeIndices[5]]; // bottom

  // Distance function
  const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  const vert1 = dist(p2, p6);
  const vert2 = dist(p3, p5);
  const horiz = dist(p1, p4);

  return (vert1 + vert2) / (2.0 * horiz);
};

export default function SleepDetector({ onSleepDetected, isActive, onActiveChange, onMetricsUpdate }: { onSleepDetected: (isAsleep: boolean) => void, isActive: boolean, onActiveChange: (b: boolean) => void, onMetricsUpdate?: (metrics: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAsleep, setIsAsleep] = useState(false);
  const isAsleepRef = useRef(false);
  const smoothedMetricsRef = useRef({ load: 0, fatigue: 0, focus: 100 });
  const [error, setError] = useState<string | null>(null);
  
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef(-1);
  const sleepFramesRef = useRef(0);
  const EAR_THRESHOLD = 0.27; // Extremely sensitive to guarantee it triggers
  const SLEEP_FRAMES_THRESHOLD = 10; // Frames before triggering alarm (approx 0.3s)

  useEffect(() => {
    async function initModel() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        // Ensure createFromOptions receives the vision object correctly, usually it just needs the vision object and options
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU" // Use CPU for max compatibility
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
      } catch (err: any) {
        console.error("Failed to load FaceLandmarker", err);
        setError("AI Model failed to load: " + (err.message || String(err)));
      }
    }
    initModel();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      onActiveChange(true);
      setError(null);
      detectFrame();
    } catch (err: any) {
      setError("Camera access denied or unavailable.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    onActiveChange(false);
    setIsAsleep(false);
    isAsleepRef.current = false;
    onSleepDetected(false);
  };

  const detectFrame = async () => {
    if (!videoRef.current) return;

    if (!landmarkerRef.current) {
      // Model not loaded yet, keep looping
      if (isActive || videoRef.current.srcObject) {
        requestRef.current = requestAnimationFrame(detectFrame);
      }
      return;
    }

    const video = videoRef.current;
    
    // Check if video is ready
    if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
      lastVideoTimeRef.current = video.currentTime;
      
      let results: any = null;
      try {
        results = landmarkerRef.current.detectForVideo(video, performance.now());
      } catch(e) {
        console.error("Detect error", e);
      }
      
      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        
        // Right eye indices (from user perspective)
        const rightEyeEAR = calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]);
        // Left eye indices
        const leftEyeEAR = calculateEAR(landmarks, [362, 385, 387, 263, 373, 380]);
        
        const avgEAR = (leftEyeEAR + rightEyeEAR) / 2;

        if (avgEAR < EAR_THRESHOLD) {
          sleepFramesRef.current += 1;
        } else {
          sleepFramesRef.current = Math.max(0, sleepFramesRef.current - 1);
        }

        const currentlySleeping = sleepFramesRef.current >= SLEEP_FRAMES_THRESHOLD;
        
        // Realistic dynamic metrics calculation based on actual eye openness
        const rawFatigue = Math.max(0, Math.min(100, (0.32 - avgEAR) * 800));
        const rawFocus = Math.max(0, Math.min(100, (avgEAR - 0.18) * 800));
        const rawLoad = Math.max(10, Math.min(90, 30 + (Math.abs(0.30 - avgEAR) * 300)));

        // Update metrics smoothly
        const prev = smoothedMetricsRef.current;
        prev.load = prev.load * 0.95 + rawLoad * 0.05;
        prev.fatigue = prev.fatigue * 0.95 + rawFatigue * 0.05;
        prev.focus = prev.focus * 0.95 + rawFocus * 0.05;

        // Use a counter for metrics update to avoid blasting React state
        if (!video.dataset.frameCount) video.dataset.frameCount = "0";
        video.dataset.frameCount = (parseInt(video.dataset.frameCount) + 1).toString();
        
        if (parseInt(video.dataset.frameCount) % 10 === 0) {
           onMetricsUpdate?.({
             load: Math.round(prev.load),
             fatigue: Math.round(prev.fatigue),
             focus: Math.round(prev.focus)
           });
        }

        if (currentlySleeping !== isAsleepRef.current) {
          isAsleepRef.current = currentlySleeping;
          setIsAsleep(currentlySleeping);
          onSleepDetected(currentlySleeping);
        }
      } else {
        // No face detected - fade metrics to 0 slowly
        const prev = smoothedMetricsRef.current;
        prev.load = prev.load * 0.95;
        prev.fatigue = prev.fatigue * 0.95;
        prev.focus = prev.focus * 0.95;
        
        sleepFramesRef.current = 0;
        
        if (!video.dataset.frameCount) video.dataset.frameCount = "0";
        video.dataset.frameCount = (parseInt(video.dataset.frameCount) + 1).toString();
        
        if (parseInt(video.dataset.frameCount) % 10 === 0) {
           onMetricsUpdate?.({
             load: Math.round(prev.load),
             fatigue: Math.round(prev.fatigue),
             focus: Math.round(prev.focus)
           });
        }
        
        if (isAsleepRef.current) {
          isAsleepRef.current = false;
          setIsAsleep(false);
          onSleepDetected(false);
        }
      }
    }

    // Keep looping as long as the video has a source stream attached
    if (video.srcObject) {
      requestRef.current = requestAnimationFrame(detectFrame);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl relative overflow-hidden flex flex-col items-center">
      <div className="flex justify-between w-full mb-4 items-center">
        <h3 className="font-display font-semibold text-sm tracking-wider uppercase text-holo-white/80">Neural Vision System</h3>
        <button 
          onClick={isActive ? stopCamera : startCamera}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${isActive ? 'bg-alert-red/20 text-alert-red border border-alert-red/50 hover:bg-alert-red/30' : 'bg-cyan-glow/20 text-cyan-glow border border-cyan-glow/50 hover:bg-cyan-glow/30'}`}
        >
          {isActive ? 'DEACTIVATE' : 'ACTIVATE CAMERA'}
        </button>
      </div>

      <div className="relative w-full aspect-video bg-neural-deep rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
        {error && (
          <div className="absolute text-alert-red text-sm flex items-center gap-2 z-20">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        
        {!isActive && !error && (
          <div className="absolute text-holo-white/40 flex flex-col items-center gap-2 z-20">
            <CameraOff className="w-8 h-8" />
            <span className="text-xs font-mono uppercase tracking-widest">Camera Offline</span>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover transform scale-x-[-1] ${!isActive ? 'opacity-0' : 'opacity-100'}`}
          playsInline
          autoPlay
          muted
        />
        
        {isActive && !error && (
          <div className="absolute top-2 left-2 flex items-center gap-2 bg-neural-void/80 px-2 py-1 rounded backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${isAsleep ? 'bg-alert-red' : 'bg-cyan-glow'} animate-pulse`} />
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isAsleep ? 'text-alert-red' : 'text-cyan-glow'}`}>
              {isAsleep ? 'DROWSINESS DETECTED' : 'MONITORING'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
