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
            if (segment.streamInfo?.type === 'transcript' && segment.streamInfo?.final) {
                const uniqueId = `${segment.participantInfo?.identity}-${segment.streamInfo?.id}`;

                if (uniqueId !== lastProcessedId.current) {
                    const isAgent = segment.participantInfo?.identity.startsWith('agent-');
                    onTranscription(segment.text, isAgent ? 'assistant' : 'user');
                    lastProcessedId.current = uniqueId;
                }
            }
        });
    }, [transcriptions, onTranscription]);

    return null;
};
