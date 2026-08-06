"use client";

import { FormEvent, useState } from "react";

type CreateCommentComposerProps = {
  selectedText: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (message: string) => Promise<void>;
};

export default function CreateCommentComposer({
  selectedText,
  isSubmitting,
  onCancel,
  onSubmit,
}: CreateCommentComposerProps) {
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || isSubmitting) {
      return;
    }

    try {
      await onSubmit(trimmedMessage);
      setMessage("");
    } catch {
      // The parent surfaces the API or anchoring failure without losing the draft.
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="syncpad-panel-enter rounded-2xl bg-white p-4 shadow-[0_12px_34px_rgba(20,20,18,0.08)] ring-2 ring-indigo-200"
      aria-busy={isSubmitting}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4f46e5]">
        New comment
      </p>

      <blockquote className="mt-3 line-clamp-3 border-l-2 border-indigo-300 pl-3 text-[13px] leading-5 text-[#6f6f69]">
        {selectedText}
      </blockquote>

      <label className="mt-4 block text-sm font-medium text-[#343431]">
        Comment
        <textarea
          autoFocus
          value={message}
          maxLength={10_000}
          required
          disabled={isSubmitting}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-24 w-full resize-y rounded-xl border border-black/[0.09] bg-[#fbfbf9] px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#4f46e5] focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-[#f1f1ee] disabled:opacity-70"
          placeholder="What would you like collaborators to know?"
        />
      </label>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-[#666660] transition duration-150 hover:bg-black/[0.04] disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!message.trim() || isSubmitting}
          className="min-h-10 rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Comment"}
        </button>
      </div>
    </form>
  );
}
