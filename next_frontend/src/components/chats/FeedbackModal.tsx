import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Feedback {
  isPositive: boolean;
  comment?: string;
  messageId: string;
}

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: Feedback) => void;
  initialFeedback: Feedback | null;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onOpenChange, onSubmit, initialFeedback }) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (initialFeedback) {
      setComment(initialFeedback.comment || '');
    } else {
      setComment('');
    }
  }, [initialFeedback]);

  const handleSubmit = () => {
    if (initialFeedback) {
      onSubmit({ ...initialFeedback, comment: comment || '' });
      onOpenChange(false); // Close modal on submit
    }
  };

  if (!initialFeedback) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {initialFeedback.isPositive ? 'What was helpful?' : 'What went wrong?'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder={
              initialFeedback.isPositive
                ? 'Tell us what was helpful about this response...'
                : 'Tell us what went wrong with this response...'
            }
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="min-h-[100px] bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
