var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server-app.ts
var server_app_exports = {};
__export(server_app_exports, {
  app: () => app,
  default: () => handler,
  handleDownloadReq: () => handleDownloadReq,
  handleHealthReq: () => handleHealthReq,
  handleParseReq: () => handleParseReq,
  handlePlaylistReq: () => handlePlaylistReq,
  handleProxyAudioReq: () => handleProxyAudioReq,
  handleProxyImageReq: () => handleProxyImageReq,
  handleResolveBatchReq: () => handleResolveBatchReq,
  handleResolveReq: () => handleResolveReq,
  handleStreamReq: () => handleStreamReq,
  handleTrackReq: () => handleTrackReq,
  parseRequestBody: () => parseRequestBody,
  sendJsonResponse: () => sendJsonResponse
});
module.exports = __toCommonJS(server_app_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_child_process = require("child_process");
var app = (0, import_express.default)();
var CACHE_DIR = "/tmp/suno_cache";
if (!import_fs.default.existsSync(CACHE_DIR)) {
  try {
    import_fs.default.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {
    console.warn("Could not create CACHE_DIR:", e);
  }
}
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Authorization, Accept, X-Requested-With");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Disposition");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use((req, res, next) => {
  if (req.body !== void 0 && typeof req.body === "object" && req.body !== null) {
    return next();
  }
  import_express.default.json({ limit: "10mb" })(req, res, next);
});
var hasFfmpegCache = null;
async function isFfmpegAvailable() {
  if (hasFfmpegCache !== null) return hasFfmpegCache;
  return new Promise((resolve) => {
    (0, import_child_process.execFile)("ffmpeg", ["-version"], (err) => {
      hasFfmpegCache = !err;
      resolve(hasFfmpegCache);
    });
  });
}
var activeTranscodes = /* @__PURE__ */ new Map();
async function getDecryptedAudioPath(trackId, audioUrl) {
  const decryptedPath = import_path.default.join(CACHE_DIR, `${trackId}_decrypted.m4a`);
  if (import_fs.default.existsSync(decryptedPath) && import_fs.default.statSync(decryptedPath).size > 5e3) {
    return decryptedPath;
  }
  if (audioUrl && audioUrl.startsWith("http")) {
    try {
      const res = await fetch(audioUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 5e3) {
          import_fs.default.writeFileSync(decryptedPath, buf);
          return decryptedPath;
        }
      }
    } catch {
    }
  }
  try {
    const apiRes = await fetch(`https://studio-api.prod.suno.com/api/clip/${trackId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });
    if (apiRes.ok) {
      const clipJson = await apiRes.json();
      if (clipJson?.audio_url && typeof clipJson.audio_url === "string" && clipJson.audio_url.startsWith("http")) {
        const audioRes = await fetch(clipJson.audio_url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          }
        });
        if (audioRes.ok) {
          const buf = Buffer.from(await audioRes.arrayBuffer());
          if (buf.length > 5e3) {
            import_fs.default.writeFileSync(decryptedPath, buf);
            return decryptedPath;
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Studio API direct audio fetch failed for ${trackId}:`, e.message);
  }
  let rights = null;
  const rightsEndpoints = [
    "https://yellow-salad.aibiei.com/rights"
  ];
  for (const ep of rightsEndpoints) {
    try {
      const rightsRes = await fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Origin": "https://usesuno.com",
          "Referer": "https://usesuno.com/tools/downloader/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          content_params: { content_id: trackId, content_type: "clip" }
        })
      });
      if (rightsRes.ok) {
        rights = await rightsRes.json();
        if (rights && rights.key && rights.iv && rights.glt) {
          break;
        }
      }
    } catch (e) {
      console.warn(`Rights fetch from ${ep} failed for ${trackId}:`, e.message);
    }
  }
  if (rights && rights.key && rights.iv && rights.glt) {
    try {
      const userKey = import_crypto.default.createHash("sha256").update(rights.glt).digest();
      const unwrap = (wrappedBase64) => {
        const buf = Buffer.from(wrappedBase64, "base64");
        const iv = buf.subarray(0, 12);
        const ciphertextWithTag = buf.subarray(12);
        const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
        const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);
        const decipher = import_crypto.default.createDecipheriv("aes-256-gcm", userKey, iv);
        decipher.setAAD(Buffer.from(trackId, "utf8"));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      };
      const contentKey = unwrap(rights.key);
      const contentIv = unwrap(rights.iv);
      const encAudioUrls = [
        `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${trackId}.m4a`,
        `https://d2lwuy8qc234o3.cloudfront.net/2/clip/${trackId}.m4a`
      ];
      for (const encAudioUrl of encAudioUrls) {
        try {
          const encRes = await fetch(encAudioUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
          });
          if (encRes.ok) {
            const encBuffer = Buffer.from(await encRes.arrayBuffer());
            const algo = contentKey.length === 32 ? "aes-256-ctr" : "aes-128-ctr";
            const decipher = import_crypto.default.createDecipheriv(algo, contentKey, contentIv);
            const decryptedBuffer = Buffer.concat([decipher.update(encBuffer), decipher.final()]);
            if (decryptedBuffer.length > 5e3) {
              import_fs.default.writeFileSync(decryptedPath, decryptedBuffer);
              return decryptedPath;
            }
          }
        } catch {
        }
      }
    } catch (err) {
      console.warn(`Audio decryption failed for ${trackId}:`, err.message);
    }
  }
  const directCandidateUrls = [
    ...audioUrl && audioUrl.startsWith("http") ? [audioUrl] : [],
    `https://cdn1.suno.ai/${trackId}.mp3`,
    `https://cdn1.suno.ai/${trackId}.mp4`,
    `https://cdn1.suno.ai/${trackId}.m4a`,
    `https://cdn2.suno.ai/${trackId}.mp3`,
    `https://cdn2.suno.ai/${trackId}.mp4`,
    `https://audiopipe.suno.ai/v1/change_target?item_id=${trackId}`,
    `https://audiopipe.suno.ai/?item_id=${trackId}`
  ];
  const candidateUrls = [];
  for (const u of directCandidateUrls) {
    candidateUrls.push(u);
    candidateUrls.push(`https://corsproxy.io/?${encodeURIComponent(u)}`);
    candidateUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
  }
  for (const cdnUrl of candidateUrls) {
    try {
      const directRes = await fetch(cdnUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": "https://suno.com/"
        }
      });
      if (directRes.ok) {
        const buf = Buffer.from(await directRes.arrayBuffer());
        if (buf.length > 5e3) {
          import_fs.default.writeFileSync(decryptedPath, buf);
          return decryptedPath;
        }
      }
    } catch {
    }
  }
  throw new Error(`Unable to fetch or decrypt audio for track ${trackId}`);
}
async function getCoverImagePath(trackId, coverUrl) {
  const coverPath = import_path.default.join(CACHE_DIR, `${trackId}_cover.jpg`);
  if (import_fs.default.existsSync(coverPath) && import_fs.default.statSync(coverPath).size > 1e3) {
    return coverPath;
  }
  const urlsToTry = [];
  if (coverUrl && coverUrl.startsWith("http")) urlsToTry.push(coverUrl);
  urlsToTry.push(`https://cdn2.suno.ai/image_large_${trackId}.jpeg`);
  urlsToTry.push(`https://cdn1.suno.ai/image_${trackId}.png`);
  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1e3) {
          import_fs.default.writeFileSync(coverPath, buf);
          return coverPath;
        }
      }
    } catch {
    }
  }
  return null;
}
async function transcodeTrack(trackId, format, bitrate = "320k", bitDepth = "24-bit", title = "", artist = "", coverUrl = "", options = {}) {
  const inputPath = await getDecryptedAudioPath(trackId, options.audioUrl);
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) {
    console.log(`Host environment has no ffmpeg binary (e.g. Vercel Serverless). Providing direct decrypted stream.`);
    return {
      filePath: inputPath,
      format: "m4a",
      mimeType: "audio/mp4"
    };
  }
  const ext = format === "m4a" ? "m4a" : format;
  const safeBitrate = (bitrate || "320k").toLowerCase().replace("bps", "");
  const hasTrim = options.startTime != null && options.startTime !== "" || options.endTime != null && options.endTime !== "";
  const trimKey = hasTrim ? `_t${options.startTime || 0}-${options.endTime || "end"}` : "";
  const normKey = options.normalize ? "_norm" : "";
  const metaKey = options.album || options.year || options.genre ? `_m${Buffer.from((options.album || "") + (options.year || "") + (options.genre || "")).toString("hex").slice(0, 8)}` : "";
  const cacheKey = `${trackId}_${format}_${format === "mp3" ? `${safeBitrate}_cov` : format === "wav" ? bitDepth : "std"}${trimKey}${normKey}${metaKey}.${ext}`;
  const outPath = import_path.default.join(CACHE_DIR, cacheKey);
  const mimeMap = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    m4a: "audio/mp4",
    ogg: "audio/ogg"
  };
  if (import_fs.default.existsSync(outPath) && import_fs.default.statSync(outPath).size > 1e3) {
    return { filePath: outPath, format, mimeType: mimeMap[format] || "audio/mpeg" };
  }
  if (activeTranscodes.has(cacheKey)) {
    const p = await activeTranscodes.get(cacheKey);
    return { filePath: p, format, mimeType: mimeMap[format] || "audio/mpeg" };
  }
  const promise = (async () => {
    let coverImagePath = null;
    if (format === "mp3") {
      coverImagePath = await getCoverImagePath(trackId, coverUrl);
    }
    return new Promise((resolve, reject) => {
      const inputArgs = ["-y"];
      if (options.startTime != null && options.startTime !== "" && !isNaN(Number(options.startTime))) {
        inputArgs.push("-ss", String(options.startTime));
      }
      if (options.endTime != null && options.endTime !== "" && !isNaN(Number(options.endTime))) {
        inputArgs.push("-to", String(options.endTime));
      }
      inputArgs.push("-i", inputPath);
      let audioArgs = [];
      const filters = [];
      if (options.normalize) {
        filters.push("loudnorm=I=-14:TP=-1:LRA=11");
      }
      if (format === "mp3") {
        if (coverImagePath) {
          inputArgs.push("-i", coverImagePath);
          audioArgs = [
            "-map",
            "0:a",
            "-map",
            "1:v",
            "-c:a",
            "libmp3lame",
            "-b:a",
            safeBitrate || "320k",
            "-c:v",
            "copy",
            "-id3v2_version",
            "3",
            "-metadata:s:v",
            "title=Album cover",
            "-metadata:s:v",
            "comment=Cover (front)"
          ];
        } else {
          audioArgs = ["-vn", "-c:a", "libmp3lame", "-b:a", safeBitrate || "320k", "-id3v2_version", "3"];
        }
      } else if (format === "wav") {
        audioArgs = ["-vn", "-c:a", bitDepth === "16-bit" ? "pcm_s16le" : "pcm_s24le"];
      } else if (format === "flac") {
        audioArgs = ["-vn", "-c:a", "flac"];
      } else if (format === "m4a") {
        audioArgs = ["-vn", "-c:a", "aac", "-b:a", "256k"];
      } else if (format === "ogg") {
        audioArgs = ["-vn", "-c:a", "libvorbis", "-q:a", "7"];
      }
      if (filters.length > 0) {
        audioArgs.push("-af", filters.join(","));
      }
      const metaArgs = [];
      if (title) metaArgs.push("-metadata", `title=${title}`);
      if (artist) metaArgs.push("-metadata", `artist=${artist}`);
      metaArgs.push("-metadata", `album=${options.album || "Suno AI"}`);
      if (options.year) metaArgs.push("-metadata", `date=${options.year}`);
      if (options.genre) metaArgs.push("-metadata", `genre=${options.genre}`);
      const args = [
        ...inputArgs,
        ...audioArgs,
        ...metaArgs,
        outPath
      ];
      (0, import_child_process.execFile)("ffmpeg", args, (err) => {
        activeTranscodes.delete(cacheKey);
        if (err) {
          console.warn(`ffmpeg transcode warning for ${trackId} (${format}):`, err.message);
          if (format === "mp3" && coverImagePath) {
            (0, import_child_process.execFile)("ffmpeg", ["-y", "-i", inputPath, "-vn", "-c:a", "libmp3lame", "-b:a", safeBitrate || "320k", "-id3v2_version", "3", ...metaArgs, outPath], (fallbackErr) => {
              if (fallbackErr) {
                resolve(inputPath);
              } else {
                resolve(outPath);
              }
            });
            return;
          }
          resolve(inputPath);
        } else {
          resolve(outPath);
        }
      });
    });
  })();
  activeTranscodes.set(cacheKey, promise);
  const resolvedPath = await promise;
  const isTranscoded = resolvedPath === outPath;
  return {
    filePath: resolvedPath,
    format: isTranscoded ? format : "m4a",
    mimeType: isTranscoded ? mimeMap[format] || "audio/mpeg" : "audio/mp4"
  };
}
async function resolveSunoShareUrl(rawUrl) {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }
  const shareMatch = targetUrl.match(/suno\.(?:com|ai)\/s\/([a-zA-Z0-9_-]+)/i);
  if (shareMatch) {
    const shareCode = shareMatch[1];
    try {
      const res = await fetch(targetUrl, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const loc = res.headers.get("location");
      if (loc) {
        const fullLoc = loc.startsWith("/") ? `https://suno.com${loc}` : loc;
        return { resolvedUrl: fullLoc, shareCode };
      }
      const followRes = await fetch(targetUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      return { resolvedUrl: followRes.url, shareCode };
    } catch (e) {
      console.warn("Error following share redirect:", e.message);
    }
  }
  return { resolvedUrl: targetUrl };
}
async function fetchPlaylistData(playlistId, sh) {
  const queryParam = sh ? `?sh=${encodeURIComponent(sh)}` : "";
  const endpoints = [
    `https://studio-api.prod.suno.com/api/playlist/${playlistId}${queryParam}`,
    `https://studio-api.suno.ai/api/playlist/${playlistId}${queryParam}`,
    `https://studio-api.prod.suno.com/api/playlist/${playlistId}/?page=1`
  ];
  let rawData = null;
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });
      if (r.ok) {
        rawData = await r.json();
        if (rawData && (rawData.playlist_clips || rawData.clips)) {
          break;
        }
      }
    } catch {
    }
  }
  if (!rawData || !(rawData.playlist_clips || rawData.clips)) {
    try {
      const pageUrl = `https://suno.com/playlist/${playlistId}${queryParam}`;
      const pageRes = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const extractedClips = [];
        const seenIds = /* @__PURE__ */ new Set();
        const clipMatches = html.matchAll(/"clip"\s*:\s*\{([^}]+"id"\s*:\s*"([a-f0-9-]{36})"[^}]*)\}/g);
        for (const m of clipMatches) {
          const cId = m[2];
          if (!seenIds.has(cId)) {
            seenIds.add(cId);
            try {
              const fullClipStr = `{${m[1]}}`;
              const parsedClip = JSON.parse(fullClipStr);
              extractedClips.push(parsedClip);
            } catch {
              extractedClips.push({ id: cId, title: `Track ${cId.slice(0, 8)}` });
            }
          }
        }
        if (extractedClips.length > 0) {
          let plTitle = `Playlist ${playlistId.slice(0, 8)}`;
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          if (titleMatch) {
            plTitle = titleMatch[1].replace(/\s*\|\s*Suno\s*$/i, "").trim();
          }
          rawData = {
            name: plTitle,
            playlist_clips: extractedClips.map((c) => ({ clip: c }))
          };
        }
      }
    } catch (e) {
      console.warn("Flight HTML fallback error for playlist:", e.message);
    }
  }
  if (rawData) {
    const rawClips = rawData.playlist_clips || rawData.clips || [];
    const tracks = rawClips.map((item) => {
      const clip = item.clip || item;
      const trackId = clip.id;
      const duration = clip.metadata?.duration ? Math.round(clip.metadata.duration) : clip.duration ? Math.round(clip.duration) : 180;
      const cdnAudio = `/api/suno/stream/${trackId}.mp3`;
      return {
        id: trackId,
        title: clip.title || `Suno Track ${trackId?.slice(0, 8)}`,
        artist: clip.display_name || clip.handle || "Suno Artist",
        handle: clip.handle ? `@${clip.handle}` : "@suno_user",
        audio_url: cdnAudio,
        video_url: clip.video_url || `https://cdn1.suno.ai/${trackId}.mp4`,
        image_url: clip.image_large_url || clip.image_url || `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
        duration,
        duration_formatted: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`,
        play_count: clip.play_count || 0,
        upvote_count: clip.upvote_count || 0,
        tags: clip.metadata?.tags || clip.display_tags || "",
        model: clip.major_model_version || "v6",
        created_at: clip.created_at || (/* @__PURE__ */ new Date()).toISOString(),
        iframe_url: `https://suno.com/embed/${trackId}`
      };
    });
    return {
      id: playlistId,
      title: rawData.name || rawData.title || "Suno Playlist",
      description: rawData.description || "",
      cover_url: rawData.image_url || tracks[0]?.image_url || "",
      tracks
    };
  }
  throw new Error("Playlist not found on Suno");
}
async function fetchTrackData(trackId) {
  let clipData = null;
  const apiUrls = [
    `https://studio-api.prod.suno.com/api/clip/${trackId}`,
    `https://studio-api.suno.ai/api/clip/${trackId}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://studio-api.prod.suno.com/api/clip/${trackId}`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://studio-api.prod.suno.com/api/clip/${trackId}`)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://studio-api.prod.suno.com/api/clip/${trackId}`)}`
  ];
  for (const apiUrl of apiUrls) {
    try {
      const apiRes = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://suno.com/",
          "Origin": "https://suno.com"
        }
      });
      if (apiRes.ok) {
        const resData = await apiRes.json();
        if (resData && (resData.id || resData.title)) {
          clipData = resData;
          break;
        }
      }
    } catch {
    }
  }
  if (!clipData) {
    try {
      const embedRes = await fetch(`https://suno.com/embed/${trackId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (embedRes.ok) {
        const html = await embedRes.text();
        const escapedClipIdx = html.indexOf('\\"clip\\":');
        if (escapedClipIdx !== -1) {
          const sub = html.slice(escapedClipIdx + 9);
          let depth = 0;
          let endIdx = -1;
          let inEscape = false;
          for (let i = 0; i < sub.length; i++) {
            if (inEscape) {
              inEscape = false;
              continue;
            }
            if (sub[i] === "\\") {
              inEscape = true;
              continue;
            }
            if (sub[i] === "{") depth++;
            else if (sub[i] === "}") {
              depth--;
              if (depth === 0) {
                endIdx = i + 1;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            const rawEscaped = sub.slice(0, endIdx);
            const unescaped = rawEscaped.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            clipData = JSON.parse(unescaped);
          }
        }
      }
    } catch {
    }
  }
  if (!clipData) {
    try {
      const songRes = await fetch(`https://suno.com/song/${trackId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (songRes.ok) {
        const html = await songRes.text();
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        let artist = "Suno Artist";
        let handle = "@suno_user";
        if (descMatch) {
          const authorMatch = descMatch[1].match(/by\s+([^(@]+)\s*\((@[^)]+)\)/i);
          if (authorMatch) {
            artist = authorMatch[1].trim();
            handle = authorMatch[2].trim();
          }
        }
        clipData = {
          id: trackId,
          title: titleMatch ? titleMatch[1] : `Suno Track ${trackId.slice(0, 8)}`,
          display_name: artist,
          handle: handle.replace("@", ""),
          image_large_url: imageMatch ? imageMatch[1] : `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
          duration: 180
        };
      }
    } catch {
    }
  }
  if (!clipData) {
    clipData = {
      id: trackId,
      title: `Suno Track ${trackId.slice(0, 8)}`,
      display_name: "Suno Artist",
      handle: "suno_user",
      audio_url: `https://cdn1.suno.ai/${trackId}.mp3`,
      image_large_url: `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
      duration: 180
    };
  }
  const duration = clipData.metadata?.duration ? Math.round(clipData.metadata.duration) : clipData.duration ? Math.round(clipData.duration) : 180;
  const audioUrl = clipData.audio_url && !clipData.audio_url.includes("forbidden") && clipData.audio_url.startsWith("http") ? clipData.audio_url : `https://cdn1.suno.ai/${trackId}.mp3`;
  return {
    id: trackId,
    title: clipData.title || `Suno Track ${trackId.slice(0, 8)}`,
    artist: clipData.display_name || clipData.handle || "Suno Artist",
    handle: clipData.handle ? `@${clipData.handle}` : "@suno_user",
    audio_url: audioUrl,
    video_url: clipData.video_url || `https://cdn1.suno.ai/${trackId}.mp4`,
    image_url: clipData.image_large_url || clipData.image_url || `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
    duration,
    duration_formatted: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`,
    play_count: clipData.play_count || 120,
    upvote_count: clipData.upvote_count || 12,
    tags: clipData.metadata?.tags || clipData.display_tags || "",
    model: clipData.major_model_version || "v6",
    created_at: clipData.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    isVerified: clipData.is_verified || false,
    iframe_url: `https://suno.com/embed/${trackId}`
  };
}
function extractSunoIds(input) {
  const trimmed = input.trim();
  const playlistMatch = trimmed.match(/suno\.(?:com|ai)\/playlist\/([a-zA-Z0-9_-]+)/i);
  if (playlistMatch) {
    return { type: "playlist", ids: [playlistMatch[1]] };
  }
  const uuidMatches = trimmed.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi);
  if (uuidMatches && uuidMatches.length > 0) {
    const uniqueIds = Array.from(new Set(uuidMatches));
    return { type: "song", ids: uniqueIds };
  }
  const profileMatch = trimmed.match(/suno\.(?:com|ai)\/@([a-zA-Z0-9_-]+)/i);
  if (profileMatch) {
    return { type: "profile", ids: [profileMatch[1]] };
  }
  return { type: "unknown", ids: [] };
}
function makeContentDisposition(filename) {
  const asciiFallback = filename.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "_").replace(/["\\;\r\n]/g, "_").trim() || "suno-audio";
  const rfc5987 = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, "%2A");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987}`;
}
async function parseRequestBody(req) {
  if (req.body !== void 0 && req.body !== null) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString("utf-8"));
      } catch {
        return {};
      }
    }
  }
  return new Promise((resolve) => {
    let data = "";
    req.on?.("data", (chunk) => {
      data += chunk;
    });
    req.on?.("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on?.("error", () => {
      resolve({});
    });
    if (req.readable === false || req.complete) {
      resolve({});
    }
  });
}
function sendJsonResponse(res, statusCode, data) {
  try {
    if (typeof res.status === "function" && typeof res.json === "function") {
      return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(data));
  } catch (e) {
    console.error("Error sending JSON response:", e);
  }
}
async function handleHealthReq(req, res) {
  const hasFfmpeg = await isFfmpegAvailable();
  return sendJsonResponse(res, 200, {
    status: "ok",
    ffmpeg: hasFfmpeg,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    platform: process.env.VERCEL ? "vercel" : "node"
  });
}
async function handleResolveReq(req, res) {
  try {
    const body = await parseRequestBody(req);
    const url = body?.url || req.query?.url;
    if (!url || typeof url !== "string") {
      return sendJsonResponse(res, 400, { error: "URL is required" });
    }
    const { resolvedUrl, shareCode } = await resolveSunoShareUrl(url);
    const playlistMatch = resolvedUrl.match(/suno\.(?:com|ai)\/playlist\/([a-zA-Z0-9_-]+)/i);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      let sh = shareCode || "";
      try {
        const parsedUrl = new URL(resolvedUrl);
        const urlSh = parsedUrl.searchParams.get("sh");
        if (urlSh) sh = urlSh;
      } catch {
      }
      const playlist = await fetchPlaylistData(playlistId, sh);
      return sendJsonResponse(res, 200, {
        type: "playlist",
        resolvedUrl,
        playlist
      });
    }
    const uuidMatch = resolvedUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) {
      const targetId = uuidMatch[0];
      if (resolvedUrl.includes("/song/") || resolvedUrl.includes("/clip/")) {
        const track = await fetchTrackData(targetId);
        return sendJsonResponse(res, 200, {
          type: "song",
          resolvedUrl,
          track
        });
      }
      try {
        const track = await fetchTrackData(targetId);
        return sendJsonResponse(res, 200, {
          type: "song",
          resolvedUrl,
          track
        });
      } catch {
        try {
          const playlist = await fetchPlaylistData(targetId, shareCode);
          return sendJsonResponse(res, 200, {
            type: "playlist",
            resolvedUrl,
            playlist
          });
        } catch {
          throw new Error(`Could not find track or playlist for ID ${targetId}`);
        }
      }
    }
    return sendJsonResponse(res, 404, { error: "Could not recognize Suno song or playlist from this URL" });
  } catch (err) {
    console.error("Resolve error:", err);
    return sendJsonResponse(res, 404, { error: err.message || "Failed to resolve Suno link" });
  }
}
async function handleResolveBatchReq(req, res) {
  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
      }
    }
    const urls = body?.urls || req.query?.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "urls array is required" });
    }
    const uniqueUrls = Array.from(new Set(urls.map((u) => String(u).trim()).filter(Boolean))).slice(0, 50);
    const resolveSingle = async (rawUrl) => {
      try {
        const { resolvedUrl, shareCode } = await resolveSunoShareUrl(rawUrl);
        const playlistMatch = resolvedUrl.match(/suno\.(?:com|ai)\/playlist\/([a-zA-Z0-9_-]+)/i);
        if (playlistMatch) {
          const playlistId = playlistMatch[1];
          let sh = shareCode || "";
          try {
            const parsedUrl = new URL(resolvedUrl);
            const urlSh = parsedUrl.searchParams.get("sh");
            if (urlSh) sh = urlSh;
          } catch {
          }
          const playlist = await fetchPlaylistData(playlistId, sh);
          return { url: rawUrl, success: true, type: "playlist", playlist };
        }
        const uuidMatch = resolvedUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (uuidMatch) {
          const targetId = uuidMatch[0];
          try {
            const track = await fetchTrackData(targetId);
            return { url: rawUrl, success: true, type: "song", track };
          } catch {
            const playlist = await fetchPlaylistData(targetId, shareCode);
            return { url: rawUrl, success: true, type: "playlist", playlist };
          }
        }
        return { url: rawUrl, success: false, error: "Could not extract valid Suno song or playlist ID" };
      } catch (err) {
        return { url: rawUrl, success: false, error: err.message || "Resolution failed" };
      }
    };
    const results = await Promise.all(uniqueUrls.map(resolveSingle));
    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Batch resolve failed" });
  }
}
async function handleParseReq(req, res) {
  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
      }
    }
    const input = body?.input || req.query?.input;
    if (!input || typeof input !== "string") {
      return res.status(400).json({ error: "Input text or URL is required" });
    }
    const extraction = extractSunoIds(input);
    return res.json({
      success: true,
      ...extraction
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to parse Suno input" });
  }
}
async function handleTrackReq(req, res) {
  const rawId = req.params?.id || req.query?.id;
  if (!rawId) {
    return res.status(400).json({ error: "Track ID is required" });
  }
  const uuidMatch = rawId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId.trim();
  try {
    const track = await fetchTrackData(trackId);
    return res.json(track);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch Suno track" });
  }
}
async function handlePlaylistReq(req, res) {
  const playlistId = req.params?.id || req.query?.id;
  const sh = req.query?.sh || "";
  try {
    const playlist = await fetchPlaylistData(playlistId, sh);
    return res.json(playlist);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch Suno playlist" });
  }
}
async function handleStreamReq(req, res) {
  const rawId = req.params?.id || req.query?.id;
  if (!rawId) {
    return res.status(400).json({ error: "Track ID required" });
  }
  const uuidMatch = rawId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId.replace(/\.(mp3|m4a|wav|mp4)$/i, "").trim();
  try {
    const result = await transcodeTrack(trackId, "mp3", "320k");
    const fileBuffer = import_fs.default.readFileSync(result.filePath);
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", fileBuffer.length);
    return res.send(fileBuffer);
  } catch (err) {
    console.warn(`Stream transcode fallback for ${trackId}:`, err.message);
    try {
      const rawPath = await getDecryptedAudioPath(trackId);
      const fileBuffer = import_fs.default.readFileSync(rawPath);
      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", fileBuffer.length);
      return res.send(fileBuffer);
    } catch (fallbackErr) {
      console.error(`Stream delivery failure for ${trackId}:`, fallbackErr.message);
      return res.status(500).json({ error: `Audio stream unavailable: ${err.message}` });
    }
  }
}
async function handleDownloadReq(req, res) {
  const rawId = req.query?.id;
  const uuidMatch = rawId?.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId?.trim();
  if (!trackId) {
    return res.status(400).json({ error: "Valid Suno track ID required" });
  }
  const rawFormat = (req.query?.format || "mp3").toLowerCase();
  const format = ["wav", "flac", "m4a", "ogg"].includes(rawFormat) ? rawFormat : "mp3";
  const bitrate = req.query?.bitrate || "320k";
  const bitDepth = req.query?.bitDepth || "24-bit";
  const title = req.query?.title || "Suno Song";
  const artist = req.query?.artist || "Suno Artist";
  const coverUrl = req.query?.cover || "";
  const audioUrl = req.query?.audioUrl || "";
  const sanitize = (s) => s.replace(/[/\\?%*:|"<>]/g, "_").trim();
  const startTime = req.query?.startTime ? Number(req.query.startTime) : void 0;
  const endTime = req.query?.endTime ? Number(req.query.endTime) : void 0;
  const album = req.query?.album || void 0;
  const year = req.query?.year || void 0;
  const genre = req.query?.genre || void 0;
  const normalize = req.query?.normalize === "true";
  try {
    const result = await transcodeTrack(trackId, format, bitrate, bitDepth, title, artist, coverUrl, {
      startTime,
      endTime,
      album,
      year,
      genre,
      normalize,
      audioUrl
    });
    const effectiveExt = result.format === "m4a" ? "m4a" : result.format;
    let safeFilename = `${sanitize(artist)} - ${sanitize(title)}.${effectiveExt}`;
    if (startTime != null && endTime != null && !isNaN(startTime) && !isNaN(endTime)) {
      const sMin = Math.floor(startTime / 60);
      const sSec = Math.floor(startTime % 60);
      const eMin = Math.floor(endTime / 60);
      const eSec = Math.floor(endTime % 60);
      safeFilename = `${sanitize(artist)} - ${sanitize(title)} [Clip ${sMin}m${sSec}s-${eMin}m${eSec}s].${effectiveExt}`;
    }
    const fileBuffer = import_fs.default.readFileSync(result.filePath);
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Disposition", makeContentDisposition(safeFilename));
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", fileBuffer.length);
    return res.send(fileBuffer);
  } catch (err) {
    console.error(`Download failed for ${trackId}:`, err);
    try {
      const rawFallback = await getDecryptedAudioPath(trackId, audioUrl);
      const fallbackFilename = `${sanitize(artist)} - ${sanitize(title)}.m4a`;
      const fileBuffer = import_fs.default.readFileSync(rawFallback);
      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Content-Disposition", makeContentDisposition(fallbackFilename));
      res.setHeader("Content-Length", fileBuffer.length);
      return res.send(fileBuffer);
    } catch {
      return res.status(500).json({ error: `Audio processing error: ${err.message}` });
    }
  }
}
async function handleProxyAudioReq(req, res) {
  const audioUrl = req.query?.url;
  if (!audioUrl) {
    return res.status(400).json({ error: "Missing url query param" });
  }
  const uuidMatch = audioUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackUuid = uuidMatch ? uuidMatch[0] : null;
  if (trackUuid) {
    try {
      const localFile = await getDecryptedAudioPath(trackUuid, audioUrl);
      const fileBuffer = import_fs.default.readFileSync(localFile);
      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", fileBuffer.length);
      return res.send(fileBuffer);
    } catch (e) {
      console.warn(`proxy-audio decrypt fallback for ${trackUuid}:`, e.message);
    }
  }
  const directCandidates = [audioUrl];
  if (trackUuid) {
    const m4aUrl = `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${trackUuid}.m4a`;
    const mp4Url = `https://cdn1.suno.ai/${trackUuid}.mp4`;
    const mp3Url = `https://cdn1.suno.ai/${trackUuid}.mp3`;
    if (!directCandidates.includes(m4aUrl)) directCandidates.push(m4aUrl);
    if (!directCandidates.includes(mp4Url)) directCandidates.push(mp4Url);
    if (!directCandidates.includes(mp3Url)) directCandidates.push(mp3Url);
  }
  const candidates = [];
  for (const c of directCandidates) {
    candidates.push(c);
    candidates.push(`https://corsproxy.io/?${encodeURIComponent(c)}`);
    candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(c)}`);
  }
  const reqHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Referer": "https://suno.com/"
  };
  if (req.headers?.range) {
    reqHeaders["Range"] = req.headers.range;
  }
  let upstreamRes = null;
  let successfulUrl = audioUrl;
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { headers: reqHeaders });
      if (resp.ok || resp.status === 206) {
        upstreamRes = resp;
        successfulUrl = url;
        break;
      }
    } catch {
    }
  }
  if (!upstreamRes) {
    return res.status(404).json({ error: "Audio stream could not be reached" });
  }
  try {
    const isPartial = upstreamRes.status === 206;
    res.status(isPartial ? 206 : 200);
    let contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType || contentType === "application/octet-stream" || contentType.includes("text/")) {
      if (successfulUrl.endsWith(".m4a") || successfulUrl.includes(".m4a")) {
        contentType = "audio/mp4";
      } else if (successfulUrl.endsWith(".mp4") || successfulUrl.includes(".mp4")) {
        contentType = "video/mp4";
      } else if (successfulUrl.endsWith(".mp3") || successfulUrl.includes(".mp3")) {
        contentType = "audio/mpeg";
      } else {
        contentType = "audio/mp4";
      }
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    if (req.query?.download === "true") {
      const filename = req.query.filename || "suno-song.mp3";
      res.setHeader("Content-Disposition", makeContentDisposition(filename));
    }
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Proxy error" });
  }
}
async function handleProxyImageReq(req, res) {
  const imageUrl = req.query?.url;
  if (!imageUrl) {
    return res.status(400).json({ error: "Missing url query param" });
  }
  try {
    const upstreamRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send("Failed to fetch image");
    }
    const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Image proxy error" });
  }
}
app.get("/api/health", handleHealthReq);
app.all("/api/suno/resolve", handleResolveReq);
app.post("/api/suno/resolve-batch", handleResolveBatchReq);
app.post("/api/suno/parse", handleParseReq);
app.get("/api/suno/track/:id", handleTrackReq);
app.get("/api/suno/playlist/:id", handlePlaylistReq);
app.get("/api/suno/stream/:id", handleStreamReq);
app.get("/api/suno/download", handleDownloadReq);
app.get("/api/suno/proxy-audio", handleProxyAudioReq);
app.get("/api/suno/proxy-image", handleProxyImageReq);
function handler(req, res) {
  return app(req, res);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  handleDownloadReq,
  handleHealthReq,
  handleParseReq,
  handlePlaylistReq,
  handleProxyAudioReq,
  handleProxyImageReq,
  handleResolveBatchReq,
  handleResolveReq,
  handleStreamReq,
  handleTrackReq,
  parseRequestBody,
  sendJsonResponse
});
