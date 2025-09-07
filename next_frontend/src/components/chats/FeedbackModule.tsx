import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiThumbsUp, FiThumbsDown } from "react-icons/fi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import posthog from "posthog-js";
import { apiClient } from "@/integrations/fastapi/client";
import { showSuccessToast, showErrorToast } from "@/utils/toastManager";

interface FeedbackModuleProps {
  messageId: string;
  threadId: string;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>; 
}

const FeedbackModule = ({
  messageId,
  threadId,
  setMessages,
}: FeedbackModuleProps) => {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");

  const handleFeedback = async (isPositive: boolean) => {
    if (feedbackSubmitted) return;

    posthog.capture("feedback_given", {
      message_id: messageId,
      thread_id: threadId,
      feedback: isPositive ? "positive" : "negative",
    });

    setFeedbackSubmitted(true);
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? {...msg, feedbackSubmitted: true} : msg
    ));

    if (isPositive) {
      await submitFeedback(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const submitFeedback = async (isPositive: boolean, comment = "") => {
    try {
      await apiClient.sendFeedback({
        message_id: messageId,
        is_positive: isPositive,
        comment,
      });

      showSuccessToast("Feedback submitted successfully");
      posthog.capture("feedback_submitted", {
        message_id: messageId,
        thread_id: threadId,
        is_positive: isPositive,
        has_comment: !!comment,
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      showErrorToast("Failed to submit feedback. Please try again.");
      setFeedbackSubmitted(false);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? {...msg, feedbackSubmitted: false} : msg
      ));
      
      posthog.capture("feedback_submission_failed", {
        message_id: messageId,
        thread_id: threadId,
        error: error.message,
      });
    }
  };

  const handleSubmit = () => {
    submitFeedback(false, comment);
    setIsModalOpen(false);
    setComment("");
  };

  if (feedbackSubmitted) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 hover:bg-gray-100"
          onClick={() => handleFeedback(true)}
        >
          <FiThumbsUp className="h-4 w-4 text-gray-500 hover:text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 hover:bg-gray-100"
          onClick={() => handleFeedback(false)}
        >
          <FiThumbsDown className="h-4 w-4 text-gray-500 hover:text-red-500" />
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Additional Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Comments (optional)</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What was the issue with this response?"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackModule;
