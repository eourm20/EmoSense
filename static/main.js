const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
let OtherUsername = "";
chat.hidden = true;
myVideo.muted = true;

let mediaRecorder;
let recordedChunks = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const mediaRecorders = {};
const recordedChunksByUser = {};


window.onload = () => {
  $(document).ready(function () {
    $("#getCodeModal").modal("show");
  });
};

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/"
});

const recognition =
  "SpeechRecognition" in window
    ? new SpeechRecognition()
    : "webkitSpeechRecognition" in window
    ? new webkitSpeechRecognition()
    : null;

let myVideoStream;
const peers = {};
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

sendmessage = (text) => {
  if (event.key === "Enter" && text.value != "") {
    socket.emit("messagesend", myname + " : " + text.value);
    text.value = "";
    main__chat_window.scrollTop = main__chat_window.scrollHeight;
  }
};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, myname);
    createRecognition(myname);
    // 오디오 추출
    const audioTracks = stream.getAudioTracks();
    const audioStream = new MediaStream(audioTracks);

    // MediaRecorder 생성 (오디오 스트림 이용)
    mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        if (!recordedChunksByUser[myname]) {
          recordedChunksByUser[myname] = [];
        }
        recordedChunksByUser[myname].push({
          data: event.data,
          timestamp: Date.now(),
        });
      }
    };
    mediaRecorder.start(100); // ms 단위로 크기 설정


    

    socket.on("user-connected", (id, username,) => {
      connectToNewUser(id, stream, username);
      socket.emit("tellName", myname);
      if (recognition) {
        recognition.stop();
        recognition.start();
      }
      
      
    });

    socket.on("user-disconnected", (id) => {
      if (peers[id]) peers[id].close();
    });
  });

peer.on("call", (call) => {
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, OtherUsername);
      });
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

peer.on("open", (id) => {
  socket.emit("join-room", roomId, id, myname);
});

socket.on("createMessage", (message) => {
  var ul = document.getElementById("messageadd");
  var li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(message));
  ul.appendChild(li);
});

socket.on("AddName", (username) => {
  OtherUsername = username;
  console.log(username);
});

const RemoveUnusedDivs = () => {
  alldivs = videoGrids.getElementsByTagName("div");
  for (var i = 0; i < alldivs.length; i++) {
    e = alldivs[i].getElementsByTagName("video").length;
    if (e == 0) {
      alldivs[i].remove();
    }
  }
};

const connectToNewUser = (userId, streams, myname) => {
  const call = peer.call(userId, streams);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, myname);
    
  });
  call.on("close", () => {
    video.remove();
    RemoveUnusedDivs();
  });
  peers[userId] = call;

  const audioTracks = streams.getAudioTracks();
  const audioStream = new MediaStream(audioTracks);
  const userMediaRecorder = new MediaRecorder(audioStream);

  userMediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      if (!recordedChunksByUser[myname]) {
        recordedChunksByUser[myname] = [];
      }
      recordedChunksByUser[myname].push(event.data);
    }
  };
  userMediaRecorder.start(100);
  mediaRecorders[myname] = userMediaRecorder;



};

const cancel = () => {
  $("#getCodeModal").modal("hide");
};

const copy = async () => {
  const roomid = document.getElementById("roomid").innerText;
  await navigator.clipboard.writeText(
    "https://emosense.o-r.kr/join/" + roomid
  );
};
const invitebox = () => {
  $("#getCodeModal").modal("show");
};

const muteUnmute = () => {
  const audioTrack = myVideoStream.getAudioTracks()[0];
  const mic = document.getElementById("mic");

  audioTrack.enabled = !audioTrack.enabled;

  if (!audioTrack.enabled) {
    mic.style.color = "red";
  } else {
    mic.style.color = "white";
  }
};

const VideomuteUnmute = () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    document.getElementById("video").style.color = "red";
  } else {
    document.getElementById("video").style.color = "white";
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const showchat = () => {
  if (chat.hidden == false) {
    chat.hidden = true;
  } else {
    chat.hidden = false;
  }
};

const addVideoStream = (videoEl, stream, name) => {
  videoEl.srcObject = stream;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });
  const h1 = document.createElement("h1");
  const h1name = document.createTextNode(name);
  h1.appendChild(h1name);
  const videoGrid = document.createElement("div");
  videoGrid.classList.add("video-grid");
  videoGrid.id = "video-grid-" + name; // 사용자 이름에 따라 고유한 ID 추가
  videoGrid.appendChild(h1);
  videoGrids.appendChild(videoGrid);
  videoGrid.append(videoEl);
  
  // Download button 추가
  const downloadButton = document.createElement("button");
  downloadButton.classList.add("download-button");
  downloadButton.innerText = "Emotion";
  downloadButton.addEventListener("click", () => downloadWAV(name));
  videoGrid.appendChild(downloadButton);

  
  RemoveUnusedDivs();
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        100 / totalUsers + "%";
    }
  }
};

const addCaption = (text, name) => {
  const videoContainer = document.getElementById("video-grid-" + name);

  const existingCaption = videoContainer.getElementsByClassName("caption")[0];
  if (existingCaption) {
    videoContainer.removeChild(existingCaption);
  }

  const captionDiv = document.createElement("div");
  captionDiv.classList.add("caption");
  captionDiv.dataset.username = name;

  const h2 = document.createElement("h2");
  h2.style.color = "black";
  const h2name = document.createTextNode(name + ":");
  h2.appendChild(h2name);

  const captionText = document.createTextNode(text);
  captionDiv.appendChild(h2);
  captionDiv.appendChild(captionText);

  videoContainer.appendChild(captionDiv);
  setTimeout(() => {
    if (videoContainer.contains(captionDiv)) {
      videoContainer.removeChild(captionDiv);
    }
  }, 3000);
};


const downloadWAV = async (userId) => {
  
  const CUT_SECONDS = 5;

  const userRecordedChunks = recordedChunksByUser[userId];
  if (!userRecordedChunks || userRecordedChunks.length === 0) {
    console.log("No recorded audio for user:", userId);
    return;
  }

  const blob = new Blob(userRecordedChunks.map(chunk => chunk.data), { type: 'audio/wav' });

  const audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Cut the last 5 seconds of audio buffer
  const startSample = Math.max(audioBuffer.length - audioContext.sampleRate * CUT_SECONDS, 0);
  const cutLength = audioBuffer.length - startSample;
  const cutBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, cutLength, audioContext.sampleRate);

  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const inputData = audioBuffer.getChannelData(ch);
    const outputData = cutBuffer.getChannelData(ch);
    outputData.set(inputData.slice(startSample, startSample + cutLength));
  }

  // Convert the cut buffer to WAV format
  const wavData = toWav(cutBuffer);

  // Create a Blob from the WAV data
  const wavBlob = new Blob([wavData], {type: 'audio/wav'});
  uploadWAV(wavBlob);
};

async function uploadWAV(wavBlob) {
  // 수정: myname을 사용하여 현재 사용자의 video-container를 찾음
  const videoContainer = document.getElementById("video-grid-" + myname);
  const formData = new FormData();
  formData.append('file', wavBlob, 'talk.wav');

  const proxy = 'https://proxy.cors.sh/';
  const endpoint = 'http://223.194.46.120:20502/test';

  try {
    const response = await fetch(proxy + endpoint, {
      headers: {
        'x-cors-api-key': 'temp_54da4863763b7eeeb26ee813a8fba11a'
        },
      method: 'POST',
      body: formData
    });

    const content = await response.text();
    const parsedContent = JSON.parse(content);
    const emotion = parsedContent.emotion;
    console.log(emotion);

   // 여기서부터 화면에 표시하는 코드 추가
   const captionDiv = document.createElement("div");
   captionDiv.classList.add("emotion");
   captionDiv.dataset.username = myname;

   const h2 = document.createElement("h2");
   h2.style.color = "black";
   const h2name = document.createTextNode("Emotion:");
   h2.appendChild(h2name);

   const captionText = document.createTextNode(emotion);
   captionDiv.appendChild(h2);
   captionDiv.appendChild(captionText);

   videoContainer.appendChild(captionDiv);
   setTimeout(() => {
     if (videoContainer.contains(captionDiv)) {
       videoContainer.removeChild(captionDiv);
     }
   }, 3000);


  } catch (error) {
    console.error('Error:', error);
  }
}

// const downloadWAV = async (userId) => {
//   const CUT_SECONDS = 5;

//   const userRecordedChunks = recordedChunksByUser[userId];
//   if (!userRecordedChunks || userRecordedChunks.length === 0) {
//     console.log("No recorded audio for user:", userId);
//     return;
//   }

//   const blob = new Blob(userRecordedChunks.map(chunk => chunk.data), { type: 'audio/wav' });

//   const audioContext = new AudioContext();
//   const arrayBuffer = await blob.arrayBuffer();
//   const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

//   // Cut the last 5 seconds of audio buffer
//   const startSample = Math.max(audioBuffer.length - audioContext.sampleRate * CUT_SECONDS, 0);
//   const cutLength = audioBuffer.length - startSample;
//   const cutBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, cutLength, audioContext.sampleRate);

//   for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
//     const inputData = audioBuffer.getChannelData(ch);
//     const outputData = cutBuffer.getChannelData(ch);
//     outputData.set(inputData.slice(startSample, startSample + cutLength));
//   }

//   // Convert the cut buffer to WAV format
//   const wavData = toWav(cutBuffer);

//   // Create a Blob from the WAV data
//   const wavBlob = new Blob([wavData], {type: 'audio/wav'});

//   // Create a URL for downloading the blob
//   const url = URL.createObjectURL(wavBlob);

//   const a = document.createElement("a");
//   a.style.display = "none";
//   a.href = url;
//   a.download = `captions_${userId}_${Date.now()}.wav`;
//   document.body.appendChild(a);
//   a.click();

//   setTimeout(() => {
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   }, 100);

// };

function toWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;

  // Create a DataView to store the WAV data
  const buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
  const view = new DataView(buffer);

  // Write the WAV header
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 32 + numSamples * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * numChannels * 2, true);
  
  // Write the audio data
  const volume = 0x7FFF;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const clipped = Math.max(-1, Math.min(sample, 1));
      const converted = (clipped * 0.5 + 0.5) * volume;
      view.setInt16(44 + i * numChannels * 2 + channel * 2, converted, true);
    }
  }

  return buffer;
}


function createRecognition(myname) {
  const recognition =
    "SpeechRecognition" in window
      ? new SpeechRecognition()
      : "webkitSpeechRecognition" in window
      ? new webkitSpeechRecognition()
      : null;

  if (!recognition) {
    console.error("Web Speech API를 사용할 수 없습니다.");
    return null;
  }

  recognition.continuous = true;
  // recognition.interimResults = true;
  recognition.lang = "ko-KR";


  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ko-KR";
    recognition.start();
    
    
    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      socket.emit("captions", { text, username: myname });
      addCaption(text, myname);
    };

    socket.on("receive-captions", ({ captions, myname }) => {
      addCaption(captions, myname);
    });

    recognition.onend = () => {
      recognition.start();
    };

    recognition.onerror = (event) => {
      console.error("Error occurred in recognition:", event.error);
    };
  }

}