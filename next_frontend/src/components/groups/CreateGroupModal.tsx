import React, { useState } from "react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupName: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [groupName, setGroupName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      onSubmit(groupName);
      setGroupName("");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        role="dialog"
        className="fixed left-[50%] top-[50%] z-50 grid w-full border-[#5D9CEC]/90 translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-white p-5 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-w-xl"
        tabIndex={-1}
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Create group</h2>
          <p className="text-sm text-muted-foreground"></p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <input
              className="flex h-9 w-full rounded-md border border-[#5D9CEC]/50 bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g. Acme Corporation"
              autoComplete="off"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              name="name"
            />
          </div>
          <div className="space-y-1 rounded-lg bg-muted p-4 text-xs bg-[#f3f3ee]/60 text-muted-foreground">
            <h2 className="font-medium">What's a group?</h2>
            <p>
              Groups let teams and communities search each other's connections. Use them to combine
              networks for recruiting, sales, fundraising, and more.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex items-center justify-center border-gray-200/50 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center text-white font-medium justify-center whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-9 px-4 py-2"
              type="submit"
              disabled={!groupName.trim()}
            >
              Create group
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
          >
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  );
};

export default CreateGroupModal;
