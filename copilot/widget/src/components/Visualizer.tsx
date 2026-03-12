import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
    active: boolean;
    audioData?: Uint8Array;
}

export const Visualizer: React.FC<VisualizerProps> = ({ active, audioData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // Gradient Line (Yajur Blue to Green)
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#007bff');
            gradient.addColorStop(0.5, '#6610f2');
            gradient.addColorStop(1, '#28a745');

            ctx.lineWidth = 3;
            ctx.strokeStyle = gradient;
            ctx.lineCap = 'round';
            ctx.beginPath();

            const bufferLength = audioData ? audioData.length : 64;
            const sliceWidth = width * 1.0 / bufferLength;
            let x = 0;

            if (active && audioData && audioData.length > 0) {
                for (let i = 0; i < bufferLength; i++) {
                    // Time-domain: silence = 128, range 0-255.
                    // Amplify deviation from centre so speech is visually obvious.
                    // deviation: -1.0 (trough) to +1.0 (peak), 0 at silence.
                    const deviation = ((audioData[i] || 128) - 128) / 128;
                    // ±45% of height around the centre line.
                    const y = height / 2 + deviation * height * 0.45;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }
            } else {
                // Flat line idle state
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
            }

            ctx.stroke();

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [active, audioData]);

    return (
        <div className="yajur-visualizer-container" style={{ width: '100%', height: '60px', overflow: 'hidden', borderRadius: '12px', background: 'rgba(0,123,255,0.05)', border: '1px solid rgba(0,123,255,0.1)' }}>
            <canvas
                ref={canvasRef}
                width={300}
                height={60}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};
