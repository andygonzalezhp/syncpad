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
      className="rounded-[1.4rem] border border-[#b7d7f0] bg-[#f4faff] p-4 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0b5cad]">
        New comment
      </p>

      <blockquote className="mt-3 line-clamp-3 border-l-2 border-[#7eb7e6] pl-3 text-sm leading-6 text-[#4f555c]">
        {selectedText}
      </blockquote>

      <label className="mt-4 block text-sm font-medium text-[#1d1d1f]">
        Comment
        <textarea
          autoFocus
          value={message}
          maxLength={10_000}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#c7d9e7] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0b5cad]"
          placeholder="What would you like collaborators to know?"
        />
      </label>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="rounded-full px-3 py-2 text-sm font-medium text-[#4f555c] transition hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!message.trim() || isSubmitting}
          className="rounded-full bg-[#0b5cad] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#084b8d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Comment"}
        </button>
      </div>
    </form>
  );
}
