import { Mark, mergeAttributes } from "@tiptap/core";

const THREAD_ID_ATTRIBUTE = "data-comment-thread-id";

export const CommentThreadMark = Mark.create({
  name: "commentThread",
  inclusive: false,
  excludes: "",

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute(THREAD_ID_ATTRIBUTE),
        renderHTML: (attributes) => {
          if (!attributes.threadId) {
            return {};
          }

          return {
            [THREAD_ID_ATTRIBUTE]: attributes.threadId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[${THREAD_ID_ATTRIBUTE}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          class: "comment-thread-mark",
        },
        HTMLAttributes,
      ),
      0,
    ];
  },
});
