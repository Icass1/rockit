/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const req = createRequire(root + "/package.json");
async function buildHarness(outputDir) {
    const css = await req("postcss")([
        req("@tailwindcss/postcss")({ base: root }),
    ]).process(
        '@import "tailwindcss";\n@import "./tokens/colors.css";\n@import "./components.css";',
        { from: root + "/styles/pip-review.css" }
    );
    fs.writeFileSync(outputDir + "/style.css", css.css);
    const mock = `import {atom} from 'nanostores';
const params=new URLSearchParams(location.search), kind=params.get('media')||'song';
const title='Una canción con un nombre extraordinariamente largo — edición especial en directo, remasterizada y con una colaboración que nunca termina '+ 'MUYLARGO'.repeat(18);
const artists=[{name:'Artista de nombre larguísimo y la Orquesta Intercontinental de Música Infinita '+ 'ARTISTA'.repeat(16),publicId:'artist',url:''}];
const song={type:'song',publicId:'sample',name:title,artists,duration_ms:65000,imageUrl:'/cover.jpg',dominantColor:params.get('color')||'#b8893b',downloaded:true};
const media=atom(kind==='empty'?undefined:kind==='station'?{...song,type:'station',name:title}:kind==='song'?song:{...song,type:'video',videoUrl:kind==='portrait'?'/portrait.webm':'/landscape.webm'});
const playing=atom(false),position=atom(12),vinyl=atom(false),repeat=atom('OFF'),queueType=atom('SORTED'),liked=atom([]);const calls={play:0,previous:0,next:0,seek:0,begin:0,end:0,like:0,shuffle:0,repeat:0,vinyl:0};
export const rockIt={queueManager:{currentMediaAtom:media,skipBack:()=>{calls.previous++},skipForward:()=>{calls.next++}},mediaPlayerManager:{playingAtom:playing,currentTimeAtom:position,togglePlayPauseOrSetMedia:()=>{playing.set(!playing.get());calls.play++},setCurrentTime:(time)=>{position.set(time);calls.seek++},beginSeek:()=>{calls.begin++},endSeek:(time)=>{position.set(time);calls.end++}},userManager:{repeatModeAtom:repeat,queueTypeAtom:queueType,toggleRandomQueue:()=>{queueType.set(queueType.get()==='RANDOM'?'SORTED':'RANDOM');calls.shuffle++},cycleRepeatMode:()=>{const modes=['OFF','ONE','ALL'];repeat.set(modes[(modes.indexOf(repeat.get())+1)%3]);calls.repeat++}},mediaManager:{likedMediaAtom:liked,toggleLikeMedia:(id)=>{liked.set(liked.get().includes(id)?[]:[id]);calls.like++}},playerUIManager:{vinylModeAtom:vinyl,initializeArtworkMode:()=>{},toggleVinylMode:()=>{vinyl.set(!vinyl.get());calls.vinyl++}},vocabularyManager:{vocabularyAtom:atom({}),langAtom:atom('en')}};
window.pipTest={calls,playing,position,vinyl,repeat,queueType,liked,media,reset:()=>Object.keys(calls).forEach(k=>calls[k]=0)};`;
    const result = await req("esbuild").build({
        stdin: {
            contents: `import React from 'react';import {createRoot} from 'react-dom/client';import PiPRoot from '@/components/PiP/PiPRoot';import PictureInPicture from '@/components/Footer/PictureInPicture/PictureInPicture';const native=new URLSearchParams(location.search).has('native');createRoot(document.getElementById('root')).render(native?<PictureInPicture/>:<PiPRoot pipWindow={window}/>);`,
            resolveDir: root,
            loader: "tsx",
        },
        bundle: true,
        write: false,
        format: "iife",
        define: { "process.env": "{}" },
        tsconfig: root + "/tsconfig.json",
        plugins: [
            {
                name: "pip-adapters",
                setup(b) {
                    b.onResolve({ filter: /^@\/lib\/rockit\/rockIt$/ }, () => ({
                        path: "rockit",
                        namespace: "mock",
                    }));
                    b.onResolve({ filter: /^@\/lib\/http$/ }, () => ({
                        path: "http",
                        namespace: "mock",
                    }));
                    b.onResolve({ filter: /^next\/image$/ }, () => ({
                        path: "image",
                        namespace: "mock",
                    }));
                    b.onLoad(
                        { filter: /.*/, namespace: "mock" },
                        ({ path }) => ({
                            loader: "jsx",
                            resolveDir: root,
                            contents:
                                path === "rockit"
                                    ? mock
                                    : path === "http"
                                      ? `export const Http={getLrclibLyricsAsync:async()=>({isOk:()=>true,result:{dynamicLyrics:new URLSearchParams(location.search).get('lyrics')==='empty'?[]:[{timestamp_s:0,text:'Una letra de ejemplo que conserva su sincronización'},{timestamp_s:20,text:'Y una línea especialmente larga para comprobar que se adapta incluso en la ventana más pequeña '+ 'letra '.repeat(25)},{timestamp_s:45,text:'Última línea de la canción'}]}})};`
                                      : `import React from 'react'; export default function Image({fill,priority,unoptimized,...props}) { return <img {...props} style={{...props.style,...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{})}}/>; }`,
                        })
                    );
                },
            },
        ],
    });
    fs.writeFileSync(outputDir + "/app.js", result.outputFiles[0].text);
    fs.writeFileSync(
        outputDir + "/index.html",
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>'
    );
    for (const f of ["song-placeholder.png", "radio-placeholder.png"])
        fs.copyFileSync(root + "/public/" + f, outputDir + "/" + f);
    fs.copyFileSync(root + "/public/background.jpg", outputDir + "/cover.jpg");
}
export { buildHarness };
