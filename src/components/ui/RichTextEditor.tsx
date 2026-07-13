"use client";

import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  type Editor,
  EditorContent,
  ReactRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { GifPicker } from "@/components/ui/GifPicker";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface MentionUser {
  id: number;
  name: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
  mentionUsers?: MentionUser[];
  compact?: boolean;
  // Show the GIF toolbar button (Tenor search popover; a GIF is inserted as a
  // plain image node). Only enabled when the backend has a Tenor key.
  enableGifs?: boolean;
}

const mentionHandle = (u: MentionUser) => u.name.replace(/\s+/g, "");

// ── Mention suggestion popup ────────────────────────────────────────────────
interface MentionListHandle {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

const MentionList = forwardRef<
  MentionListHandle,
  { items: MentionUser[]; command: (u: { id: string; label: string }) => void }
>(function MentionList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [items]);

  const pick = (i: number) => {
    const u = items[i];
    if (u) command({ id: String(u.id), label: mentionHandle(u) });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        setSelected((s) => (s - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === "Enter") {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;
  return (
    <div
      className="aero-menu flex flex-col rounded-lg overflow-hidden"
      style={{
        minWidth: 160,
        background: "#1c1a16",
        border: "1px solid var(--cf-edge)",
      }}
    >
      {items.map((u, i) => (
        <button
          key={u.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            pick(i);
          }}
          className="cf-mono px-3 py-2 text-left cursor-pointer transition-colors"
          style={{
            fontSize: 12,
            color: i === selected ? "var(--cf-phosphor)" : "var(--cf-text)",
            background:
              i === selected ? "rgba(255,255,255,0.06)" : "transparent",
          }}
        >
          @{u.name.split(" ")[0]}{" "}
          <span style={{ fontSize: 10, color: "var(--cf-text-muted)" }}>
            {u.name}
          </span>
        </button>
      ))}
    </div>
  );
});

function mentionSuggestion(users: MentionUser[]) {
  return {
    items: ({ query }: { query: string }) =>
      users
        .filter((u) =>
          mentionHandle(u).toLowerCase().startsWith(query.toLowerCase()),
        )
        .slice(0, 6),
    render: () => {
      let component: ReactRenderer<MentionListHandle> | null = null;
      let el: HTMLDivElement | null = null;
      const position = (rect: DOMRect | null) => {
        if (!el || !rect) return;
        el.style.top = `${rect.bottom + 4}px`;
        el.style.left = `${rect.left}px`;
      };
      return {
        onStart: (props: { clientRect?: (() => DOMRect | null) | null }) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: (props as unknown as { editor: Editor }).editor,
          });
          el = document.createElement("div");
          el.style.position = "fixed";
          el.style.zIndex = "9999";
          el.appendChild(component.element);
          document.body.appendChild(el);
          position(props.clientRect?.() ?? null);
        },
        onUpdate: (props: { clientRect?: (() => DOMRect | null) | null }) => {
          component?.updateProps(props);
          position(props.clientRect?.() ?? null);
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") return true;
          return component?.ref?.onKeyDown(props.event) ?? false;
        },
        onExit: () => {
          el?.remove();
          el = null;
          component?.destroy();
          component = null;
        },
      };
    },
  };
}

// ── Toolbar ─────────────────────────────────────────────────────────────────
function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="cf-mono cursor-pointer rounded transition-colors"
      style={{
        minWidth: 26,
        height: 26,
        padding: "0 6px",
        fontSize: 12,
        fontWeight: 700,
        color: active ? "var(--cf-phosphor)" : "var(--cf-text-muted)",
        background: active ? "rgba(154,166,126,0.15)" : "transparent",
        border: "1px solid var(--cf-edge)",
      }}
    >
      {children}
    </button>
  );
}

const Sep = () => (
  <span
    style={{
      width: 1,
      height: 18,
      background: "var(--cf-edge)",
      margin: "0 2px",
    }}
  />
);

function Toolbar({
  editor,
  onPickImage,
  onPickGif,
  uploading,
  compact,
}: {
  editor: Editor;
  onPickImage: () => void;
  onPickGif?: () => void;
  uploading: boolean;
  compact?: boolean;
}) {
  // Re-render toolbar on selection/content changes so active states stay in sync.
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force((n) => n + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
  };

  return (
    <div
      className="rte-toolbar flex flex-wrap items-center gap-1 pb-2 mb-2"
      style={{ borderBottom: "1px solid var(--cf-edge)" }}
    >
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        title="Strike"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </ToolbarButton>
      {!compact && (
        <>
          <Sep />
          <ToolbarButton
            title="Heading 1"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </ToolbarButton>
        </>
      )}
      <Sep />
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarButton>
      {!compact && (
        <>
          <ToolbarButton
            title="Ordered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            title="Task list"
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            title="Quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {"</>"}
          </ToolbarButton>
        </>
      )}
      <Sep />
      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        🔗
      </ToolbarButton>
      {!compact && (
        <ToolbarButton
          title="Table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          ▦
        </ToolbarButton>
      )}
      <ToolbarButton
        title={uploading ? "Uploading…" : "Insert image"}
        onClick={onPickImage}
      >
        {uploading ? "…" : "🖼"}
      </ToolbarButton>
      {onPickGif && (
        <ToolbarButton title="Insert GIF" onClick={onPickGif}>
          <span className="cf-mono" style={{ fontSize: "10px" }}>
            GIF
          </span>
        </ToolbarButton>
      )}
    </div>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder,
  onUploadImage,
  mentionUsers,
  compact,
  enableGifs = false,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const [gifOpen, setGifOpen] = useState(false);

  const extensions = [
    StarterKit.configure({
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),
    Image.configure({ inline: false, HTMLAttributes: { class: "rt-image" } }),
    Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    ...(mentionUsers
      ? [
          Mention.configure({
            HTMLAttributes: { class: "mention" },
            renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
            suggestion: mentionSuggestion(mentionUsers),
          }),
        ]
      : []),
  ];

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions,
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `rich-content ProseMirror-focused${compact ? " rt-compact" : ""}`,
      },
      handlePaste: (_view, event) =>
        handleFiles(Array.from(event.clipboardData?.files ?? []), event),
      handleDrop: (_view, event) =>
        handleFiles(
          Array.from((event as DragEvent).dataTransfer?.files ?? []),
          event,
        ),
    },
  });

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  // Keep the editor in sync when the parent swaps to a different card.
  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    // Pass emitUpdate=false: syncing editability must NOT fire onUpdate, otherwise
    // every card mount emits a spurious change that marks the card dirty on open.
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  const uploadAndInsert = async (file: File) => {
    if (!onUploadImage) return;
    setUploading(true);
    uploadingRef.current = true;
    try {
      const url = await onUploadImage(file);
      editorRef.current?.chain().focus().setImage({ src: url }).run();
    } catch {
      /* surfaced by caller's error UI */
    } finally {
      setUploading(false);
      uploadingRef.current = false;
    }
  };

  // Returns true (handled) when at least one image file was intercepted.
  function handleFiles(files: File[], event: Event): boolean {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0 || !onUploadImage) return false;
    event.preventDefault();
    images.forEach(uploadAndInsert);
    return true;
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col relative">
      {editable && (
        <Toolbar
          editor={editor}
          uploading={uploading}
          compact={compact}
          onPickImage={() => fileInputRef.current?.click()}
          onPickGif={enableGifs ? () => setGifOpen((o) => !o) : undefined}
        />
      )}
      {gifOpen && (
        <GifPicker
          onClose={() => setGifOpen(false)}
          onPick={(url, alt) => {
            editorRef.current?.chain().focus().setImage({ src: url, alt }).run();
            setGifOpen(false);
          }}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadAndInsert(f);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}
