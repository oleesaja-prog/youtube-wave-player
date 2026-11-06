let player;
let playlist = JSON.parse(localStorage.getItem('my_playlist')) || [];
let currentSongIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

// Elemen DOM
const urlInput = document.getElementById('youtube-url');
const addBtn = document.getElementById('add-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
const songTitle = document.getElementById('song-title');
const songStatus = document.getElementById('song-status');
const playlistEl = document.getElementById('playlist');
const playlistCount = document.getElementById('playlist-count');
const progressBar = document.getElementById('progress-bar');
const progressFilled = document.getElementById('progress-filled');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

let timerInterval;

// Inisialisasi YouTube API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    updatePlaylistUI();
    if (playlist.length > 0) {
        songTitle.innerText = "Ready to play";
    }
}

// Fungsi utama untuk memutar lagu (Sudah digabung & diperbaiki agar fitur buffering aktif)
function playSong(index) {
    if (playlist.length === 0) return;
    currentSongIndex = index;
    const song = playlist[currentSongIndex];

    player.loadVideoById(song.videoId);
    songTitle.innerText = song.title;
    songStatus.innerText = "Memuat (Buffering)..."; // Indikator awal saat memuat
    playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Ikon loading berputar
    isPlaying = true;
    updatePlaylistUI();
}

// Status Player YouTube Berubah (Buffering, Playing, Paused, Ended)
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.BUFFERING) {
        songStatus.innerText = "Buffering...";
        playPauseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } 
    // else if (event.data === YT.PlayerState.PLAYING) {
    //     songStatus.innerText = "Memutar...";
    //     playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    // } 
    // else if (event.data === YT.PlayerState.PAUSED) {
    //     songStatus.innerText = "Dijeda";
    //     playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    // }
    // else if (event.data === YT.PlayerState.ENDED) {
    //     playNextSong();
    // }
    else if (event.data === YT.PlayerState.PLAYING) {
        songStatus.innerText = "Memutar...";
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        startProgressTimer(); // Jalankan garis progres saat lagu berputar
    } 
    else if (event.data === YT.PlayerState.PAUSED) {
        songStatus.innerText = "Dijeda";
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        stopProgressTimer(); // Hentikan timer saat dijeda
    }
    else if (event.data === YT.PlayerState.ENDED) {
        stopProgressTimer();
        playNextSong();
    }
}


// Ekstrak ID YouTube
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Tambah Lagu
addBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    const videoId = extractYouTubeId(url);

    if (!videoId) {
        alert("Invalid YouTube link!");
        return;
    }

    const title = `Youtube Song (${videoId})`;
    
    playlist.push({ videoId, title });
    saveAndRender();
    urlInput.value = '';

    if (playlist.length === 1) {
        playSong(0);
    }
});

function saveAndRender() {
    localStorage.setItem('my_playlist', JSON.stringify(playlist));
    updatePlaylistUI();
}

function updatePlaylistUI() {
    playlistEl.innerHTML = '';
    playlistCount.innerText = playlist.length;

    playlist.forEach((song, index) => {
        const li = document.createElement('li');
        if (index === currentSongIndex) li.classList.add('active');
        
        li.innerHTML = `
            <span>${index + 1}. ${song.title}</span>
            <button onclick="deleteSong(event, ${index})"><i class="fa-solid fa-trash"></i></button>
        `;
        li.addEventListener('click', () => playSong(index));
        playlistEl.appendChild(li);
    });
}

function deleteSong(event, index) {
    event.stopPropagation();
    playlist.splice(index, 1);
    saveAndRender();
    if (playlist.length === 0) {
        player.stopVideo();
        songTitle.innerText = "Select or add a song";
        songStatus.innerText = "Waiting for music...";
    } else if (index === currentSongIndex) {
        playSong(0);
    }
}

// Kontrol Play/Pause
playPauseBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        songStatus.innerText = "Paused";
        isPlaying = false;
    } else {
        if(player.getCurrentTime() === 0 && currentSongIndex === 0) {
            playSong(0);
        } else {
            player.playVideo();
        }
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        songStatus.innerText = "Memutar...";
        isPlaying = true;
    }
});

// Next & Prev
nextBtn.addEventListener('click', playNextSong);
prevBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    playSong(currentSongIndex);
});

function playNextSong() {
    if (playlist.length === 0) return;

    if (isShuffle) {
        currentSongIndex = Math.floor(Math.random() * playlist.length);
    } else if (isRepeat) {
        playSong(currentSongIndex);
        return;
    } else {
        currentSongIndex = (currentSongIndex + 1) % playlist.length;
    }
    playSong(currentSongIndex);
}

// Penanganan Error Embedding YouTube
function onPlayerError(event) {
    if (event.data === 101 || event.data === 150) {
        alert("Lagu ini dibatasi embed oleh pemiliknya. Melewati ke lagu berikutnya.");
        playNextSong();
    }
}

// Tombol Shuffle & Repeat
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.style.color = isShuffle ? '#38bdf8' : '#94a3b8';
});

repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.style.color = isRepeat ? '#38bdf8' : '#94a3b8';
});
// Fungsi untuk memformat detik ke format menit:detik (cth: 3:45)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Mulai timer untuk menggerakkan garis progres
function startProgressTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (player && typeof player.getCurrentTime === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            if (duration > 0) {
                const percent = (currentTime / duration) * 100;
                progressFilled.style.width = `${percent}%`;
                currentTimeEl.innerText = formatTime(currentTime);
                durationEl.innerText = formatTime(duration);
            }
        }
    }, 500);
}

// Hentikan timer saat dijeda atau lagu selesai
function stopProgressTimer() {
    clearInterval(timerInterval);
}

// Fitur klik garis untuk melompat ke durasi tertentu
progressBar.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = player.getDuration();
    
    if (duration > 0) {
        const newTime = (clickX / width) * duration;
        player.seekTo(newTime, true);
    }
});