"use client";

import Image from "next/image";
import { useState } from "react";
import { Copy, Download, ExternalLink } from "lucide-react";

type MockupImage = {
  channel: "etsy" | "instagram" | "shopify";
  fileName: string;
  prompt: string;
  ratioLabel: string;
  size: string;
  url: string;
};

export function MockupGallery({
  images,
  title = "Generated mockups",
}: {
  images: MockupImage[];
  title?: string;
}) {
  const [status, setStatus] = useState("");

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Mockup Gallery</p>
          <h3 className="mt-2 text-2xl font-black text-white">{title}</h3>
        </div>
        {status ? <p className="text-xs text-slate-400">{status}</p> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {images.map((image) => (
          <article key={`${image.channel}-${image.url}`} className="overflow-hidden rounded-[1.75rem] border border-white/5 bg-[#141417]">
            <div className="aspect-[4/4] overflow-hidden bg-[#0A0A0B]">
              <Image
                alt={`${image.channel} mockup`}
                className="h-full w-full object-cover"
                height={1024}
                src={image.url}
                unoptimized
                width={1024}
              />
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">{image.channel}</p>
                  <h4 className="mt-2 text-lg font-bold text-white">{image.ratioLabel}</h4>
                </div>
                <span className="rounded-full border border-white/10 bg-[#0A0A0B] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {image.size}
                </span>
              </div>

              <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">{image.prompt}</p>

              <div className="grid gap-2">
                <a
                  href={image.url}
                  download={image.fileName}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-slate-200"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(image.url);
                      setStatus(`${image.channel} mockup URL copied.`);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-white/20 hover:bg-white/10"
                  >
                    <Copy className="h-3 w-3" />
                    Copy URL
                  </button>
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-white/20 hover:bg-white/10"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
