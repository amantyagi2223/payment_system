"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type ExistingMedia = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  isPrimary?: boolean;
};

type SelectedMedia = {
  id: string;
  file: File;
  type: "IMAGE" | "VIDEO";
  previewUrl: string | null;
};

type ProductMediaPickerProps = {
  imageInputName?: string;
  videoInputName?: string;
  removeExistingFieldName?: string;
  existingMedia?: ExistingMedia[];
  showExistingRemove?: boolean;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ProductMediaPicker({
  imageInputName = "imageFiles",
  videoInputName = "videoFiles",
  removeExistingFieldName = "removeImageIds",
  existingMedia = [],
  showExistingRemove = false,
}: ProductMediaPickerProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [markedForRemoval, setMarkedForRemoval] = useState<Record<string, boolean>>({});

  const selectedImages = useMemo(
    () => selectedMedia.filter((item) => item.type === "IMAGE"),
    [selectedMedia],
  );
  const selectedVideos = useMemo(
    () => selectedMedia.filter((item) => item.type === "VIDEO"),
    [selectedMedia],
  );

  function syncInputFiles(input: HTMLInputElement | null, files: File[]) {
    if (!input) return;
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  }

  useEffect(() => {
    syncInputFiles(
      imageInputRef.current,
      selectedImages.map((item) => item.file),
    );
    syncInputFiles(
      videoInputRef.current,
      selectedVideos.map((item) => item.file),
    );
  }, [selectedImages, selectedVideos]);

  useEffect(() => {
    return () => {
      selectedMedia.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [selectedMedia]);

  function appendFiles(files: File[], type: "IMAGE" | "VIDEO") {
    const nextItems: SelectedMedia[] = files.map((file) => ({
      id: makeId(),
      file,
      type,
      previewUrl: type === "IMAGE" ? URL.createObjectURL(file) : null,
    }));
    setSelectedMedia((prev) => [...prev, ...nextItems]);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      appendFiles(files, "IMAGE");
    }
    event.target.value = "";
  }

  function handleVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      appendFiles(files, "VIDEO");
    }
    event.target.value = "";
  }

  function removeSelectedMedia(itemId: string) {
    setSelectedMedia((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== itemId);
    });
  }

  function toggleExistingRemoval(id: string) {
    setMarkedForRemoval((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-100"
        >
          Add Images
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
        >
          Add Videos
        </button>
        <p className="text-xs text-slate-500">Add files one by one or select multiple files at once.</p>
      </div>

      <input
        ref={imageInputRef}
        name={imageInputName}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        name={videoInputName}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleVideoChange}
      />

      {showExistingRemove && existingMedia.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Current Media</h4>
          <ul className="mt-2 space-y-2">
            {existingMedia.map((item) => {
              const isMarked = Boolean(markedForRemoval[item.id]);
              return (
                <li
                  key={item.id}
                  className={[
                    "flex items-center gap-3 rounded-lg border p-2",
                    isMarked ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  {item.type === "IMAGE" ? (
                    <img src={item.url} alt="Product media" className="h-12 w-12 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      VID
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800">{item.url}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.type}
                      {item.isPrimary ? " • Primary" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExistingRemoval(item.id)}
                    className={[
                      "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition",
                      isMarked
                        ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
                    ].join(" ")}
                  >
                    {isMarked ? "Undo Remove" : "Remove"}
                  </button>
                  {isMarked ? <input type="hidden" name={removeExistingFieldName} value={item.id} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div>
        <h4 className="text-sm font-semibold text-slate-900">Files To Upload</h4>
        {selectedMedia.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {selectedMedia.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2">
                {item.type === "IMAGE" && item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.file.name} className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    VID
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-900">{item.file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.type} • {formatBytes(item.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelectedMedia(item.id)}
                  className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No new files selected yet.</p>
        )}
      </div>
    </div>
  );
}
