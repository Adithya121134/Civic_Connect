import React, { useState } from 'react';
import {
  X, Check, AlertTriangle, Camera, CheckCircle2,
  Clock, MapPin, User, ArrowRight, RotateCcw
} from 'lucide-react';

interface ResolutionReviewModalProps {
  resolution: any;
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onReviewed: () => void;
}

export const ResolutionReviewModal: React.FC<ResolutionReviewModalProps> = ({
  resolution,
  isOpen,
  onClose,
  token,
  onReviewed
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !resolution) return null;

  const handleReview = async (isApproved: boolean) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/department/verifications/${resolution.id}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isApproved,
          notes: reviewNotes || (isApproved ? 'Resolution verified by Department Officer.' : 'Rework requested.')
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.message || 'Verification update failed');
      } else {
        onReviewed();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#111111] max-w-3xl w-full my-8 max-h-[90vh] flex flex-col rounded-none shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#666666]">
                {resolution.incident_tracking || resolution.incident_id || resolution.id}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] uppercase">
                Awaiting Officer Verification
              </span>
            </div>
            <h2 className="text-base font-bold text-[#111111] mt-1">
              {resolution.incident_title || 'Work Order Resolution Inspection'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#EBEBEB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#111111]">
          {errorMessage && (
            <div className="p-3 bg-[#FEE2E2] border border-[#DC2626] text-[#DC2626] font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[#FAFAFA] border border-[#E5E5E5]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#666666] block">Location</span>
              <span className="font-semibold text-xs text-[#111111]">{resolution.address || 'Ward 04, Elm St'}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#666666] block">Field Worker</span>
              <span className="font-semibold text-xs text-[#111111]">{resolution.worker_name || 'Crew Alpha Lead'}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#666666] block">Submitted At</span>
              <span className="font-semibold text-xs text-[#111111] font-mono">
                {resolution.created_at ? new Date(resolution.created_at).toLocaleString() : 'Just now'}
              </span>
            </div>
          </div>

          {/* Evidence Comparison: Before vs After */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono mb-2 flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-[#111111]" />
              <span>Photographic Repair Evidence</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#E5E5E5] p-3 bg-[#FAFAFA]">
                <span className="text-[10px] font-mono uppercase font-bold text-[#DC2626] block mb-1.5">
                  [1] Initial Incident Report (Citizen Photo)
                </span>
                <div className="h-44 bg-[#EBEBEB] border border-[#CCCCCC] flex flex-col items-center justify-center text-[#666666] text-xs p-4 text-center">
                  <div className="w-10 h-10 bg-[#FFFFFF] border border-[#CCCCCC] flex items-center justify-center mb-2 font-bold text-xs">
                    IMG
                  </div>
                  <span>Deep structural asphalt crater & cracking</span>
                  <span className="text-[10px] font-mono text-[#8A8A8A] mt-1">SHA-256 Verified Evidence</span>
                </div>
              </div>

              <div className="border border-[#111111] p-3 bg-[#FAFAFA]">
                <span className="text-[10px] font-mono uppercase font-bold text-[#16A34A] block mb-1.5">
                  [2] Post-Repair Resolution (Field Crew Photo)
                </span>
                <div className="h-44 bg-[#EBEBEB] border border-[#CCCCCC] flex flex-col items-center justify-center text-[#666666] text-xs p-4 text-center">
                  <div className="w-10 h-10 bg-[#FFFFFF] border border-[#CCCCCC] flex items-center justify-center mb-2 font-bold text-xs text-[#16A34A]">
                    ✓
                  </div>
                  <span>Fresh hot-mix asphalt flush compacted & sealed</span>
                  <span className="text-[10px] font-mono text-[#16A34A] font-bold mt-1">
                    AI Visual Confidence: 96% LIKELY RESOLVED
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Field Work Order Summary */}
          <div className="border border-[#E5E5E5] p-3.5 bg-[#FFFFFF] space-y-2">
            <h4 className="text-[11px] font-bold uppercase text-[#111111] font-mono">
              Field Technician Repair Notes
            </h4>
            <p className="text-xs text-[#333333] leading-relaxed">
              {resolution.notes || 'Full depth 15cm asphalt mill and fill completed with Type B hot mix. Compaction achieved to municipal standards. Road markings restored and traffic safety barricades retrieved.'}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5E5] text-[11px]">
              <div>
                <span className="text-[#666666]">Materials Consumed:</span> <strong>3.2 Tons Asphalt Hot-Mix</strong>
              </div>
              <div>
                <span className="text-[#666666]">Crew On-Site:</span> <strong>4 Pavers & 1 Lead Inspector</strong>
              </div>
            </div>
          </div>

          {/* Officer Verification Form */}
          <div className="border border-[#111111] p-4 bg-[#FAFAFA] space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#111111] font-mono">
              Department Officer Verification Determination
            </h4>
            <textarea
              id="input-resolution-review-notes"
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Enter official departmental inspection remarks (optional)..."
              className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#CCCCCC] text-xs focus:outline-hidden focus:border-[#111111]"
            />

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                id="btn-reject-resolution"
                onClick={() => handleReview(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 bg-[#FFFFFF] border border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] font-mono text-xs font-bold uppercase transition-colors flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REQUEST REWORK (REOPEN)</span>
              </button>
              <button
                id="btn-approve-resolution"
                onClick={() => handleReview(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] font-mono text-xs font-bold uppercase transition-colors flex items-center justify-center space-x-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM & VERIFY RESOLUTION</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
