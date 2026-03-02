import React, { useEffect, useRef } from 'react';
import { useTranscriptions } from '@livekit/components-react';

interface TranscriptionSyncProps {
    onTranscription: (text: string, role: 'user' | 'assistant') => void;
}

export const TranscriptionSync: React.FC<TranscriptionSyncProps> = ({ onTranscription }) => {
    const transcriptions = useTranscriptions();
    const lastProcessedId = useRef<string | null>(null);

    useEffect(() => {
        transcriptions.forEach((segment: any) => {
            if (segment.final) {
                const uniqueId = `${segment.participant?.identity}-${segment.id}`;

                if (uniqueId !== lastProcessedId.current) {
                    const isAgent = segment.participant?.identity?.startsWith('agent-');
                    onTranscription(segment.text, isAgent ? 'assistant' : 'user');
                    lastProcessedId.current = uniqueId;
                }
            }
        });
    }, [transcriptions, onTranscription]);

    return null;
};
