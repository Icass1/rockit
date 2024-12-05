from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class YTMusicSongAudioOnlyPlayabilityRenderer:
    trackingParams: str
    audioOnlyAvailability: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongAudioOnlyPlayabilityRenderer':
        _trackingParams = obj.get('trackingParams') if obj and 'trackingParams' in obj else None
        _audioOnlyAvailability = obj.get('audioOnlyAvailability') if obj and 'audioOnlyAvailability' in obj else None
        return YTMusicSongAudioOnlyPlayabilityRenderer(_trackingParams, _audioOnlyAvailability, obj)
    def __getitem__(self, item):
        if item == 'trackingParams':
            return self.trackingParams
        elif item == 'audioOnlyAvailability':
            return self.audioOnlyAvailability
        return None

@dataclass
class YTMusicSongAudioOnlyPlayability:
    audioOnlyPlayabilityRenderer: YTMusicSongAudioOnlyPlayabilityRenderer
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongAudioOnlyPlayability':
        _audioOnlyPlayabilityRenderer = YTMusicSongAudioOnlyPlayabilityRenderer.from_dict(obj.get('audioOnlyPlayabilityRenderer')) if obj and 'audioOnlyPlayabilityRenderer' in obj else None
        return YTMusicSongAudioOnlyPlayability(_audioOnlyPlayabilityRenderer, obj)
    def __getitem__(self, item):
        if item == 'audioOnlyPlayabilityRenderer':
            return self.audioOnlyPlayabilityRenderer
        return None

@dataclass
class YTMusicSongMiniplayerRenderer:
    playbackMode: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongMiniplayerRenderer':
        _playbackMode = obj.get('playbackMode') if obj and 'playbackMode' in obj else None
        return YTMusicSongMiniplayerRenderer(_playbackMode, obj)
    def __getitem__(self, item):
        if item == 'playbackMode':
            return self.playbackMode
        return None

@dataclass
class YTMusicSongMiniplayer:
    miniplayerRenderer: YTMusicSongMiniplayerRenderer
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongMiniplayer':
        _miniplayerRenderer = YTMusicSongMiniplayerRenderer.from_dict(obj.get('miniplayerRenderer')) if obj and 'miniplayerRenderer' in obj else None
        return YTMusicSongMiniplayer(_miniplayerRenderer, obj)
    def __getitem__(self, item):
        if item == 'miniplayerRenderer':
            return self.miniplayerRenderer
        return None

@dataclass
class YTMusicSongPlayabilityStatus:
    status: str
    playableInEmbed: bool
    audioOnlyPlayability: YTMusicSongAudioOnlyPlayability
    miniplayer: YTMusicSongMiniplayer
    contextParams: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongPlayabilityStatus':
        _status = obj.get('status') if obj and 'status' in obj else None
        _playableInEmbed = obj.get('playableInEmbed') if obj and 'playableInEmbed' in obj else None
        _audioOnlyPlayability = YTMusicSongAudioOnlyPlayability.from_dict(obj.get('audioOnlyPlayability')) if obj and 'audioOnlyPlayability' in obj else None
        _miniplayer = YTMusicSongMiniplayer.from_dict(obj.get('miniplayer')) if obj and 'miniplayer' in obj else None
        _contextParams = obj.get('contextParams') if obj and 'contextParams' in obj else None
        return YTMusicSongPlayabilityStatus(_status, _playableInEmbed, _audioOnlyPlayability, _miniplayer, _contextParams, obj)
    def __getitem__(self, item):
        if item == 'status':
            return self.status
        elif item == 'playableInEmbed':
            return self.playableInEmbed
        elif item == 'audioOnlyPlayability':
            return self.audioOnlyPlayability
        elif item == 'miniplayer':
            return self.miniplayer
        elif item == 'contextParams':
            return self.contextParams
        return None

@dataclass
class YTMusicSongFormats:
    itag: int
    mimeType: str
    bitrate: int
    width: int
    height: int
    lastModified: str
    quality: str
    xtags: str
    fps: int
    qualityLabel: str
    projectionType: str
    audioQuality: str
    approxDurationMs: str
    audioSampleRate: str
    audioChannels: int
    signatureCipher: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongFormats':
        _itag = obj.get('itag') if obj and 'itag' in obj else None
        _mimeType = obj.get('mimeType') if obj and 'mimeType' in obj else None
        _bitrate = obj.get('bitrate') if obj and 'bitrate' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _lastModified = obj.get('lastModified') if obj and 'lastModified' in obj else None
        _quality = obj.get('quality') if obj and 'quality' in obj else None
        _xtags = obj.get('xtags') if obj and 'xtags' in obj else None
        _fps = obj.get('fps') if obj and 'fps' in obj else None
        _qualityLabel = obj.get('qualityLabel') if obj and 'qualityLabel' in obj else None
        _projectionType = obj.get('projectionType') if obj and 'projectionType' in obj else None
        _audioQuality = obj.get('audioQuality') if obj and 'audioQuality' in obj else None
        _approxDurationMs = obj.get('approxDurationMs') if obj and 'approxDurationMs' in obj else None
        _audioSampleRate = obj.get('audioSampleRate') if obj and 'audioSampleRate' in obj else None
        _audioChannels = obj.get('audioChannels') if obj and 'audioChannels' in obj else None
        _signatureCipher = obj.get('signatureCipher') if obj and 'signatureCipher' in obj else None
        return YTMusicSongFormats(_itag, _mimeType, _bitrate, _width, _height, _lastModified, _quality, _xtags, _fps, _qualityLabel, _projectionType, _audioQuality, _approxDurationMs, _audioSampleRate, _audioChannels, _signatureCipher, obj)
    def __getitem__(self, item):
        if item == 'itag':
            return self.itag
        elif item == 'mimeType':
            return self.mimeType
        elif item == 'bitrate':
            return self.bitrate
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        elif item == 'lastModified':
            return self.lastModified
        elif item == 'quality':
            return self.quality
        elif item == 'xtags':
            return self.xtags
        elif item == 'fps':
            return self.fps
        elif item == 'qualityLabel':
            return self.qualityLabel
        elif item == 'projectionType':
            return self.projectionType
        elif item == 'audioQuality':
            return self.audioQuality
        elif item == 'approxDurationMs':
            return self.approxDurationMs
        elif item == 'audioSampleRate':
            return self.audioSampleRate
        elif item == 'audioChannels':
            return self.audioChannels
        elif item == 'signatureCipher':
            return self.signatureCipher
        return None

@dataclass
class YTMusicSongInitRange:
    start: str
    end: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongInitRange':
        _start = obj.get('start') if obj and 'start' in obj else None
        _end = obj.get('end') if obj and 'end' in obj else None
        return YTMusicSongInitRange(_start, _end, obj)
    def __getitem__(self, item):
        if item == 'start':
            return self.start
        elif item == 'end':
            return self.end
        return None

@dataclass
class YTMusicSongIndexRange:
    start: str
    end: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongIndexRange':
        _start = obj.get('start') if obj and 'start' in obj else None
        _end = obj.get('end') if obj and 'end' in obj else None
        return YTMusicSongIndexRange(_start, _end, obj)
    def __getitem__(self, item):
        if item == 'start':
            return self.start
        elif item == 'end':
            return self.end
        return None

@dataclass
class YTMusicSongAdaptiveFormats:
    itag: int
    mimeType: str
    bitrate: int
    width: int
    height: int
    initRange: YTMusicSongInitRange
    indexRange: YTMusicSongIndexRange
    lastModified: str
    contentLength: str
    quality: str
    fps: int
    qualityLabel: str
    projectionType: str
    averageBitrate: int
    approxDurationMs: str
    signatureCipher: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongAdaptiveFormats':
        _itag = obj.get('itag') if obj and 'itag' in obj else None
        _mimeType = obj.get('mimeType') if obj and 'mimeType' in obj else None
        _bitrate = obj.get('bitrate') if obj and 'bitrate' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _initRange = YTMusicSongInitRange.from_dict(obj.get('initRange')) if obj and 'initRange' in obj else None
        _indexRange = YTMusicSongIndexRange.from_dict(obj.get('indexRange')) if obj and 'indexRange' in obj else None
        _lastModified = obj.get('lastModified') if obj and 'lastModified' in obj else None
        _contentLength = obj.get('contentLength') if obj and 'contentLength' in obj else None
        _quality = obj.get('quality') if obj and 'quality' in obj else None
        _fps = obj.get('fps') if obj and 'fps' in obj else None
        _qualityLabel = obj.get('qualityLabel') if obj and 'qualityLabel' in obj else None
        _projectionType = obj.get('projectionType') if obj and 'projectionType' in obj else None
        _averageBitrate = obj.get('averageBitrate') if obj and 'averageBitrate' in obj else None
        _approxDurationMs = obj.get('approxDurationMs') if obj and 'approxDurationMs' in obj else None
        _signatureCipher = obj.get('signatureCipher') if obj and 'signatureCipher' in obj else None
        return YTMusicSongAdaptiveFormats(_itag, _mimeType, _bitrate, _width, _height, _initRange, _indexRange, _lastModified, _contentLength, _quality, _fps, _qualityLabel, _projectionType, _averageBitrate, _approxDurationMs, _signatureCipher, obj)
    def __getitem__(self, item):
        if item == 'itag':
            return self.itag
        elif item == 'mimeType':
            return self.mimeType
        elif item == 'bitrate':
            return self.bitrate
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        elif item == 'initRange':
            return self.initRange
        elif item == 'indexRange':
            return self.indexRange
        elif item == 'lastModified':
            return self.lastModified
        elif item == 'contentLength':
            return self.contentLength
        elif item == 'quality':
            return self.quality
        elif item == 'fps':
            return self.fps
        elif item == 'qualityLabel':
            return self.qualityLabel
        elif item == 'projectionType':
            return self.projectionType
        elif item == 'averageBitrate':
            return self.averageBitrate
        elif item == 'approxDurationMs':
            return self.approxDurationMs
        elif item == 'signatureCipher':
            return self.signatureCipher
        return None

@dataclass
class YTMusicSongStreamingData:
    expiresInSeconds: str
    formats: List[YTMusicSongFormats]
    adaptiveFormats: List[YTMusicSongAdaptiveFormats]
    serverAbrStreamingUrl: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongStreamingData':
        _expiresInSeconds = obj.get('expiresInSeconds') if obj and 'expiresInSeconds' in obj else None
        _formats = [YTMusicSongFormats.from_dict(k) for k in obj.get('formats')] if obj and 'formats' in obj else None
        _adaptiveFormats = [YTMusicSongAdaptiveFormats.from_dict(k) for k in obj.get('adaptiveFormats')] if obj and 'adaptiveFormats' in obj else None
        _serverAbrStreamingUrl = obj.get('serverAbrStreamingUrl') if obj and 'serverAbrStreamingUrl' in obj else None
        return YTMusicSongStreamingData(_expiresInSeconds, _formats, _adaptiveFormats, _serverAbrStreamingUrl, obj)
    def __getitem__(self, item):
        if item == 'expiresInSeconds':
            return self.expiresInSeconds
        elif item == 'formats':
            return self.formats
        elif item == 'adaptiveFormats':
            return self.adaptiveFormats
        elif item == 'serverAbrStreamingUrl':
            return self.serverAbrStreamingUrl
        return None

@dataclass
class YTMusicSongHeaders:
    headerType: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongHeaders':
        _headerType = obj.get('headerType') if obj and 'headerType' in obj else None
        return YTMusicSongHeaders(_headerType, obj)
    def __getitem__(self, item):
        if item == 'headerType':
            return self.headerType
        return None

@dataclass
class YTMusicSongVideostatsPlaybackUrl:
    baseUrl: str
    headers: List[YTMusicSongHeaders]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongVideostatsPlaybackUrl':
        _baseUrl = obj.get('baseUrl') if obj and 'baseUrl' in obj else None
        _headers = [YTMusicSongHeaders.from_dict(k) for k in obj.get('headers')] if obj and 'headers' in obj else None
        return YTMusicSongVideostatsPlaybackUrl(_baseUrl, _headers, obj)
    def __getitem__(self, item):
        if item == 'baseUrl':
            return self.baseUrl
        elif item == 'headers':
            return self.headers
        return None

@dataclass
class YTMusicSongHeaders:
    headerType: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongHeaders':
        _headerType = obj.get('headerType') if obj and 'headerType' in obj else None
        return YTMusicSongHeaders(_headerType, obj)
    def __getitem__(self, item):
        if item == 'headerType':
            return self.headerType
        return None

@dataclass
class YTMusicSongVideostatsDelayplayUrl:
    baseUrl: str
    headers: List[YTMusicSongHeaders]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongVideostatsDelayplayUrl':
        _baseUrl = obj.get('baseUrl') if obj and 'baseUrl' in obj else None
        _headers = [YTMusicSongHeaders.from_dict(k) for k in obj.get('headers')] if obj and 'headers' in obj else None
        return YTMusicSongVideostatsDelayplayUrl(_baseUrl, _headers, obj)
    def __getitem__(self, item):
        if item == 'baseUrl':
            return self.baseUrl
        elif item == 'headers':
            return self.headers
        return None

@dataclass
class YTMusicSongHeaders:
    headerType: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongHeaders':
        _headerType = obj.get('headerType') if obj and 'headerType' in obj else None
        return YTMusicSongHeaders(_headerType, obj)
    def __getitem__(self, item):
        if item == 'headerType':
            return self.headerType
        return None

@dataclass
class YTMusicSongVideostatsWatchtimeUrl:
    baseUrl: str
    headers: List[YTMusicSongHeaders]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongVideostatsWatchtimeUrl':
        _baseUrl = obj.get('baseUrl') if obj and 'baseUrl' in obj else None
        _headers = [YTMusicSongHeaders.from_dict(k) for k in obj.get('headers')] if obj and 'headers' in obj else None
        return YTMusicSongVideostatsWatchtimeUrl(_baseUrl, _headers, obj)
    def __getitem__(self, item):
        if item == 'baseUrl':
            return self.baseUrl
        elif item == 'headers':
            return self.headers
        return None

@dataclass
class YTMusicSongHeaders:
    headerType: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongHeaders':
        _headerType = obj.get('headerType') if obj and 'headerType' in obj else None
        return YTMusicSongHeaders(_headerType, obj)
    def __getitem__(self, item):
        if item == 'headerType':
            return self.headerType
        return None

@dataclass
class YTMusicSongPtrackingUrl:
    baseUrl: str
    headers: List[YTMusicSongHeaders]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongPtrackingUrl':
        _baseUrl = obj.get('baseUrl') if obj and 'baseUrl' in obj else None
        _headers = [YTMusicSongHeaders.from_dict(k) for k in obj.get('headers')] if obj and 'headers' in obj else None
        return YTMusicSongPtrackingUrl(_baseUrl, _headers, obj)
    def __getitem__(self, item):
        if item == 'baseUrl':
            return self.baseUrl
        elif item == 'headers':
            return self.headers
        return None

@dataclass
class YTMusicSongHeaders:
    headerType: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongHeaders':
        _headerType = obj.get('headerType') if obj and 'headerType' in obj else None
        return YTMusicSongHeaders(_headerType, obj)
    def __getitem__(self, item):
        if item == 'headerType':
            return self.headerType
        return None

@dataclass
class YTMusicSongQoeUrl:
    baseUrl: str
    headers: List[YTMusicSongHeaders]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongQoeUrl':
        _baseUrl = obj.get('baseUrl') if obj and 'baseUrl' in obj else None
        _headers = [YTMusicSongHeaders.from_dict(k) for k in obj.get('headers')] if obj and 'headers' in obj else None
        return YTMusicSongQoeUrl(_baseUrl, _headers, obj)
    def __getitem__(self, item):
        if item == 'baseUrl':
            return self.baseUrl
        elif item == 'headers':
            return self.headers
        return None

@dataclass
class YTMusicSongHeaders:
    headerType: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongHeaders':
        _headerType = obj.get('headerType') if obj and 'headerType' in obj else None
        return YTMusicSongHeaders(_headerType, obj)
    def __getitem__(self, item):
        if item == 'headerType':
            return self.headerType
        return None

@dataclass
class YTMusicSongAtrUrl:
    baseUrl: str
    elapsedMediaTimeSeconds: int
    headers: List[YTMusicSongHeaders]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongAtrUrl':
        _baseUrl = obj.get('baseUrl') if obj and 'baseUrl' in obj else None
        _elapsedMediaTimeSeconds = obj.get('elapsedMediaTimeSeconds') if obj and 'elapsedMediaTimeSeconds' in obj else None
        _headers = [YTMusicSongHeaders.from_dict(k) for k in obj.get('headers')] if obj and 'headers' in obj else None
        return YTMusicSongAtrUrl(_baseUrl, _elapsedMediaTimeSeconds, _headers, obj)
    def __getitem__(self, item):
        if item == 'baseUrl':
            return self.baseUrl
        elif item == 'elapsedMediaTimeSeconds':
            return self.elapsedMediaTimeSeconds
        elif item == 'headers':
            return self.headers
        return None

@dataclass
class YTMusicSongPlaybackTracking:
    videostatsPlaybackUrl: YTMusicSongVideostatsPlaybackUrl
    videostatsDelayplayUrl: YTMusicSongVideostatsDelayplayUrl
    videostatsWatchtimeUrl: YTMusicSongVideostatsWatchtimeUrl
    ptrackingUrl: YTMusicSongPtrackingUrl
    qoeUrl: YTMusicSongQoeUrl
    atrUrl: YTMusicSongAtrUrl
    videostatsScheduledFlushWalltimeSeconds: List[int]
    videostatsDefaultFlushIntervalSeconds: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongPlaybackTracking':
        _videostatsPlaybackUrl = YTMusicSongVideostatsPlaybackUrl.from_dict(obj.get('videostatsPlaybackUrl')) if obj and 'videostatsPlaybackUrl' in obj else None
        _videostatsDelayplayUrl = YTMusicSongVideostatsDelayplayUrl.from_dict(obj.get('videostatsDelayplayUrl')) if obj and 'videostatsDelayplayUrl' in obj else None
        _videostatsWatchtimeUrl = YTMusicSongVideostatsWatchtimeUrl.from_dict(obj.get('videostatsWatchtimeUrl')) if obj and 'videostatsWatchtimeUrl' in obj else None
        _ptrackingUrl = YTMusicSongPtrackingUrl.from_dict(obj.get('ptrackingUrl')) if obj and 'ptrackingUrl' in obj else None
        _qoeUrl = YTMusicSongQoeUrl.from_dict(obj.get('qoeUrl')) if obj and 'qoeUrl' in obj else None
        _atrUrl = YTMusicSongAtrUrl.from_dict(obj.get('atrUrl')) if obj and 'atrUrl' in obj else None
        _videostatsScheduledFlushWalltimeSeconds = obj.get('videostatsScheduledFlushWalltimeSeconds') if obj and 'videostatsScheduledFlushWalltimeSeconds' in obj else None
        _videostatsDefaultFlushIntervalSeconds = obj.get('videostatsDefaultFlushIntervalSeconds') if obj and 'videostatsDefaultFlushIntervalSeconds' in obj else None
        return YTMusicSongPlaybackTracking(_videostatsPlaybackUrl, _videostatsDelayplayUrl, _videostatsWatchtimeUrl, _ptrackingUrl, _qoeUrl, _atrUrl, _videostatsScheduledFlushWalltimeSeconds, _videostatsDefaultFlushIntervalSeconds, obj)
    def __getitem__(self, item):
        if item == 'videostatsPlaybackUrl':
            return self.videostatsPlaybackUrl
        elif item == 'videostatsDelayplayUrl':
            return self.videostatsDelayplayUrl
        elif item == 'videostatsWatchtimeUrl':
            return self.videostatsWatchtimeUrl
        elif item == 'ptrackingUrl':
            return self.ptrackingUrl
        elif item == 'qoeUrl':
            return self.qoeUrl
        elif item == 'atrUrl':
            return self.atrUrl
        elif item == 'videostatsScheduledFlushWalltimeSeconds':
            return self.videostatsScheduledFlushWalltimeSeconds
        elif item == 'videostatsDefaultFlushIntervalSeconds':
            return self.videostatsDefaultFlushIntervalSeconds
        return None

@dataclass
class YTMusicSongThumbnails:
    url: str
    width: int
    height: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongThumbnails':
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        return YTMusicSongThumbnails(_url, _width, _height, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        return None

@dataclass
class YTMusicSongThumbnail:
    thumbnails: List[YTMusicSongThumbnails]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongThumbnail':
        _thumbnails = [YTMusicSongThumbnails.from_dict(k) for k in obj.get('thumbnails')] if obj and 'thumbnails' in obj else None
        return YTMusicSongThumbnail(_thumbnails, obj)
    def __getitem__(self, item):
        if item == 'thumbnails':
            return self.thumbnails
        return None

@dataclass
class YTMusicSongVideoDetails:
    videoId: str
    title: str
    lengthSeconds: str
    channelId: str
    isOwnerViewing: bool
    isCrawlable: bool
    thumbnail: YTMusicSongThumbnail
    allowRatings: bool
    viewCount: str
    author: str
    isPrivate: bool
    isUnpluggedCorpus: bool
    musicVideoType: str
    isLiveContent: bool
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongVideoDetails':
        _videoId = obj.get('videoId') if obj and 'videoId' in obj else None
        _title = obj.get('title') if obj and 'title' in obj else None
        _lengthSeconds = obj.get('lengthSeconds') if obj and 'lengthSeconds' in obj else None
        _channelId = obj.get('channelId') if obj and 'channelId' in obj else None
        _isOwnerViewing = obj.get('isOwnerViewing') if obj and 'isOwnerViewing' in obj else None
        _isCrawlable = obj.get('isCrawlable') if obj and 'isCrawlable' in obj else None
        _thumbnail = YTMusicSongThumbnail.from_dict(obj.get('thumbnail')) if obj and 'thumbnail' in obj else None
        _allowRatings = obj.get('allowRatings') if obj and 'allowRatings' in obj else None
        _viewCount = obj.get('viewCount') if obj and 'viewCount' in obj else None
        _author = obj.get('author') if obj and 'author' in obj else None
        _isPrivate = obj.get('isPrivate') if obj and 'isPrivate' in obj else None
        _isUnpluggedCorpus = obj.get('isUnpluggedCorpus') if obj and 'isUnpluggedCorpus' in obj else None
        _musicVideoType = obj.get('musicVideoType') if obj and 'musicVideoType' in obj else None
        _isLiveContent = obj.get('isLiveContent') if obj and 'isLiveContent' in obj else None
        return YTMusicSongVideoDetails(_videoId, _title, _lengthSeconds, _channelId, _isOwnerViewing, _isCrawlable, _thumbnail, _allowRatings, _viewCount, _author, _isPrivate, _isUnpluggedCorpus, _musicVideoType, _isLiveContent, obj)
    def __getitem__(self, item):
        if item == 'videoId':
            return self.videoId
        elif item == 'title':
            return self.title
        elif item == 'lengthSeconds':
            return self.lengthSeconds
        elif item == 'channelId':
            return self.channelId
        elif item == 'isOwnerViewing':
            return self.isOwnerViewing
        elif item == 'isCrawlable':
            return self.isCrawlable
        elif item == 'thumbnail':
            return self.thumbnail
        elif item == 'allowRatings':
            return self.allowRatings
        elif item == 'viewCount':
            return self.viewCount
        elif item == 'author':
            return self.author
        elif item == 'isPrivate':
            return self.isPrivate
        elif item == 'isUnpluggedCorpus':
            return self.isUnpluggedCorpus
        elif item == 'musicVideoType':
            return self.musicVideoType
        elif item == 'isLiveContent':
            return self.isLiveContent
        return None

@dataclass
class YTMusicSongThumbnails:
    url: str
    width: int
    height: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongThumbnails':
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        return YTMusicSongThumbnails(_url, _width, _height, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        return None

@dataclass
class YTMusicSongThumbnail1:
    thumbnails: List[YTMusicSongThumbnails]
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongThumbnail1':
        _thumbnails = [YTMusicSongThumbnails.from_dict(k) for k in obj.get('thumbnails')] if obj and 'thumbnails' in obj else None
        return YTMusicSongThumbnail1(_thumbnails, obj)
    def __getitem__(self, item):
        if item == 'thumbnails':
            return self.thumbnails
        return None

@dataclass
class YTMusicSongPageOwnerDetails:
    name: str
    externalChannelId: str
    youtubeProfileUrl: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongPageOwnerDetails':
        _name = obj.get('name') if obj and 'name' in obj else None
        _externalChannelId = obj.get('externalChannelId') if obj and 'externalChannelId' in obj else None
        _youtubeProfileUrl = obj.get('youtubeProfileUrl') if obj and 'youtubeProfileUrl' in obj else None
        return YTMusicSongPageOwnerDetails(_name, _externalChannelId, _youtubeProfileUrl, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'externalChannelId':
            return self.externalChannelId
        elif item == 'youtubeProfileUrl':
            return self.youtubeProfileUrl
        return None

@dataclass
class YTMusicSongVideoDetails1:
    externalVideoId: str
    durationSeconds: str
    durationIso8601: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongVideoDetails1':
        _externalVideoId = obj.get('externalVideoId') if obj and 'externalVideoId' in obj else None
        _durationSeconds = obj.get('durationSeconds') if obj and 'durationSeconds' in obj else None
        _durationIso8601 = obj.get('durationIso8601') if obj and 'durationIso8601' in obj else None
        return YTMusicSongVideoDetails1(_externalVideoId, _durationSeconds, _durationIso8601, obj)
    def __getitem__(self, item):
        if item == 'externalVideoId':
            return self.externalVideoId
        elif item == 'durationSeconds':
            return self.durationSeconds
        elif item == 'durationIso8601':
            return self.durationIso8601
        return None

@dataclass
class YTMusicSongLinkAlternates:
    hrefUrl: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongLinkAlternates':
        _hrefUrl = obj.get('hrefUrl') if obj and 'hrefUrl' in obj else None
        return YTMusicSongLinkAlternates(_hrefUrl, obj)
    def __getitem__(self, item):
        if item == 'hrefUrl':
            return self.hrefUrl
        return None

@dataclass
class YTMusicSongMicroformatDataRenderer:
    urlCanonical: str
    title: str
    description: str
    thumbnail: YTMusicSongThumbnail1
    siteName: str
    appName: str
    androidPackage: str
    iosAppStoreId: str
    iosAppArguments: str
    ogType: str
    urlApplinksIos: str
    urlApplinksAndroid: str
    urlTwitterIos: str
    urlTwitterAndroid: str
    twitterCardType: str
    twitterSiteHandle: str
    schemaDotOrgType: str
    noindex: bool
    unlisted: bool
    paid: bool
    familySafe: bool
    tags: List[str]
    availableCountries: List[str]
    pageOwnerDetails: YTMusicSongPageOwnerDetails
    videoDetails: YTMusicSongVideoDetails1
    linkAlternates: List[YTMusicSongLinkAlternates]
    viewCount: str
    publishDate: str
    category: str
    uploadDate: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongMicroformatDataRenderer':
        _urlCanonical = obj.get('urlCanonical') if obj and 'urlCanonical' in obj else None
        _title = obj.get('title') if obj and 'title' in obj else None
        _description = obj.get('description') if obj and 'description' in obj else None
        _thumbnail = YTMusicSongThumbnail1.from_dict(obj.get('thumbnail')) if obj and 'thumbnail' in obj else None
        _siteName = obj.get('siteName') if obj and 'siteName' in obj else None
        _appName = obj.get('appName') if obj and 'appName' in obj else None
        _androidPackage = obj.get('androidPackage') if obj and 'androidPackage' in obj else None
        _iosAppStoreId = obj.get('iosAppStoreId') if obj and 'iosAppStoreId' in obj else None
        _iosAppArguments = obj.get('iosAppArguments') if obj and 'iosAppArguments' in obj else None
        _ogType = obj.get('ogType') if obj and 'ogType' in obj else None
        _urlApplinksIos = obj.get('urlApplinksIos') if obj and 'urlApplinksIos' in obj else None
        _urlApplinksAndroid = obj.get('urlApplinksAndroid') if obj and 'urlApplinksAndroid' in obj else None
        _urlTwitterIos = obj.get('urlTwitterIos') if obj and 'urlTwitterIos' in obj else None
        _urlTwitterAndroid = obj.get('urlTwitterAndroid') if obj and 'urlTwitterAndroid' in obj else None
        _twitterCardType = obj.get('twitterCardType') if obj and 'twitterCardType' in obj else None
        _twitterSiteHandle = obj.get('twitterSiteHandle') if obj and 'twitterSiteHandle' in obj else None
        _schemaDotOrgType = obj.get('schemaDotOrgType') if obj and 'schemaDotOrgType' in obj else None
        _noindex = obj.get('noindex') if obj and 'noindex' in obj else None
        _unlisted = obj.get('unlisted') if obj and 'unlisted' in obj else None
        _paid = obj.get('paid') if obj and 'paid' in obj else None
        _familySafe = obj.get('familySafe') if obj and 'familySafe' in obj else None
        _tags = obj.get('tags') if obj and 'tags' in obj else None
        _availableCountries = obj.get('availableCountries') if obj and 'availableCountries' in obj else None
        _pageOwnerDetails = YTMusicSongPageOwnerDetails.from_dict(obj.get('pageOwnerDetails')) if obj and 'pageOwnerDetails' in obj else None
        _videoDetails = YTMusicSongVideoDetails1.from_dict(obj.get('videoDetails')) if obj and 'videoDetails' in obj else None
        _linkAlternates = [YTMusicSongLinkAlternates.from_dict(k) for k in obj.get('linkAlternates')] if obj and 'linkAlternates' in obj else None
        _viewCount = obj.get('viewCount') if obj and 'viewCount' in obj else None
        _publishDate = obj.get('publishDate') if obj and 'publishDate' in obj else None
        _category = obj.get('category') if obj and 'category' in obj else None
        _uploadDate = obj.get('uploadDate') if obj and 'uploadDate' in obj else None
        return YTMusicSongMicroformatDataRenderer(_urlCanonical, _title, _description, _thumbnail, _siteName, _appName, _androidPackage, _iosAppStoreId, _iosAppArguments, _ogType, _urlApplinksIos, _urlApplinksAndroid, _urlTwitterIos, _urlTwitterAndroid, _twitterCardType, _twitterSiteHandle, _schemaDotOrgType, _noindex, _unlisted, _paid, _familySafe, _tags, _availableCountries, _pageOwnerDetails, _videoDetails, _linkAlternates, _viewCount, _publishDate, _category, _uploadDate, obj)
    def __getitem__(self, item):
        if item == 'urlCanonical':
            return self.urlCanonical
        elif item == 'title':
            return self.title
        elif item == 'description':
            return self.description
        elif item == 'thumbnail':
            return self.thumbnail
        elif item == 'siteName':
            return self.siteName
        elif item == 'appName':
            return self.appName
        elif item == 'androidPackage':
            return self.androidPackage
        elif item == 'iosAppStoreId':
            return self.iosAppStoreId
        elif item == 'iosAppArguments':
            return self.iosAppArguments
        elif item == 'ogType':
            return self.ogType
        elif item == 'urlApplinksIos':
            return self.urlApplinksIos
        elif item == 'urlApplinksAndroid':
            return self.urlApplinksAndroid
        elif item == 'urlTwitterIos':
            return self.urlTwitterIos
        elif item == 'urlTwitterAndroid':
            return self.urlTwitterAndroid
        elif item == 'twitterCardType':
            return self.twitterCardType
        elif item == 'twitterSiteHandle':
            return self.twitterSiteHandle
        elif item == 'schemaDotOrgType':
            return self.schemaDotOrgType
        elif item == 'noindex':
            return self.noindex
        elif item == 'unlisted':
            return self.unlisted
        elif item == 'paid':
            return self.paid
        elif item == 'familySafe':
            return self.familySafe
        elif item == 'tags':
            return self.tags
        elif item == 'availableCountries':
            return self.availableCountries
        elif item == 'pageOwnerDetails':
            return self.pageOwnerDetails
        elif item == 'videoDetails':
            return self.videoDetails
        elif item == 'linkAlternates':
            return self.linkAlternates
        elif item == 'viewCount':
            return self.viewCount
        elif item == 'publishDate':
            return self.publishDate
        elif item == 'category':
            return self.category
        elif item == 'uploadDate':
            return self.uploadDate
        return None

@dataclass
class YTMusicSongMicroformat:
    microformatDataRenderer: YTMusicSongMicroformatDataRenderer
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicSongMicroformat':
        _microformatDataRenderer = YTMusicSongMicroformatDataRenderer.from_dict(obj.get('microformatDataRenderer')) if obj and 'microformatDataRenderer' in obj else None
        return YTMusicSongMicroformat(_microformatDataRenderer, obj)
    def __getitem__(self, item):
        if item == 'microformatDataRenderer':
            return self.microformatDataRenderer
        return None

@dataclass
class RawYTMusicApiSong:
    playabilityStatus: YTMusicSongPlayabilityStatus
    streamingData: YTMusicSongStreamingData
    playbackTracking: YTMusicSongPlaybackTracking
    videoDetails: YTMusicSongVideoDetails
    microformat: YTMusicSongMicroformat
    _json: dict
    def from_dict(obj: Any) -> 'RawYTMusicApiSong':
        _playabilityStatus = YTMusicSongPlayabilityStatus.from_dict(obj.get('playabilityStatus')) if obj and 'playabilityStatus' in obj else None
        _streamingData = YTMusicSongStreamingData.from_dict(obj.get('streamingData')) if obj and 'streamingData' in obj else None
        _playbackTracking = YTMusicSongPlaybackTracking.from_dict(obj.get('playbackTracking')) if obj and 'playbackTracking' in obj else None
        _videoDetails = YTMusicSongVideoDetails.from_dict(obj.get('videoDetails')) if obj and 'videoDetails' in obj else None
        _microformat = YTMusicSongMicroformat.from_dict(obj.get('microformat')) if obj and 'microformat' in obj else None
        return RawYTMusicApiSong(_playabilityStatus, _streamingData, _playbackTracking, _videoDetails, _microformat, obj)
    def __getitem__(self, item):
        if item == 'playabilityStatus':
            return self.playabilityStatus
        elif item == 'streamingData':
            return self.streamingData
        elif item == 'playbackTracking':
            return self.playbackTracking
        elif item == 'videoDetails':
            return self.videoDetails
        elif item == 'microformat':
            return self.microformat
        return None

