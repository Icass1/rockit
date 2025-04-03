from typing import List, Any
from dataclasses import dataclass

@dataclass
class RockItUserLists:
    createdAt: int
    type: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItUserLists':
        _createdAt = obj.get('createdAt') if obj and 'createdAt' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return RockItUserLists(_createdAt, _type, _id, obj)
    def __getitem__(self, item):
        if item == 'createdAt':
            return self.createdAt
        elif item == 'type':
            return self.type
        elif item == 'id':
            return self.id
        return None

@dataclass
class RockItUserLastPlayedSong:
    _json: dict
    def from_dict(obj: Any) -> 'RockItUserLastPlayedSong':
        return RockItUserLastPlayedSong(obj)
    def __getitem__(self, item) -> List[int]:
        return self._json[item]

@dataclass
class RockItUserLikedSongs:
    createdAt: int
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItUserLikedSongs':
        _createdAt = obj.get('createdAt') if obj and 'createdAt' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return RockItUserLikedSongs(_createdAt, _id, obj)
    def __getitem__(self, item):
        if item == 'createdAt':
            return self.createdAt
        elif item == 'id':
            return self.id
        return None

@dataclass
class RockItUserPinnedLists:
    createdAt: int
    type: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItUserPinnedLists':
        _createdAt = obj.get('createdAt') if obj and 'createdAt' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return RockItUserPinnedLists(_createdAt, _type, _id, obj)
    def __getitem__(self, item):
        if item == 'createdAt':
            return self.createdAt
        elif item == 'type':
            return self.type
        elif item == 'id':
            return self.id
        return None

@dataclass
class RawRockItApiUser:
    id: str
    username: str
    passwordHash: str
    lists: List[RockItUserLists]
    lastPlayedSong: RockItUserLastPlayedSong
    currentSong: str
    currentStation: Any
    currentTime: float
    queue: List[Any]
    queueIndex: int
    randomQueue: int
    repeatSong: int
    likedSongs: List[RockItUserLikedSongs]
    pinnedLists: List[RockItUserPinnedLists]
    volume: int
    crossFade: int
    lang: str
    admin: int
    superAdmin: int
    impersonateId: str
    devUser: int
    updatedAt: int
    createdAt: int
    _json: dict
    def from_dict(obj: Any) -> 'RawRockItApiUser':
        _id = obj.get('id') if obj and 'id' in obj else None
        _username = obj.get('username') if obj and 'username' in obj else None
        _passwordHash = obj.get('passwordHash') if obj and 'passwordHash' in obj else None
        _lists = [RockItUserLists.from_dict(k) for k in obj.get('lists')] if obj and 'lists' in obj else None
        _lastPlayedSong = RockItUserLastPlayedSong.from_dict(obj.get('lastPlayedSong')) if obj and 'lastPlayedSong' in obj else None
        _currentSong = obj.get('currentSong') if obj and 'currentSong' in obj else None
        _currentStation = obj.get('currentStation') if obj and 'currentStation' in obj else None
        _currentTime = obj.get('currentTime') if obj and 'currentTime' in obj else None
        _queue = obj.get('queue') if obj and 'queue' in obj else None
        _queueIndex = obj.get('queueIndex') if obj and 'queueIndex' in obj else None
        _randomQueue = obj.get('randomQueue') if obj and 'randomQueue' in obj else None
        _repeatSong = obj.get('repeatSong') if obj and 'repeatSong' in obj else None
        _likedSongs = [RockItUserLikedSongs.from_dict(k) for k in obj.get('likedSongs')] if obj and 'likedSongs' in obj else None
        _pinnedLists = [RockItUserPinnedLists.from_dict(k) for k in obj.get('pinnedLists')] if obj and 'pinnedLists' in obj else None
        _volume = obj.get('volume') if obj and 'volume' in obj else None
        _crossFade = obj.get('crossFade') if obj and 'crossFade' in obj else None
        _lang = obj.get('lang') if obj and 'lang' in obj else None
        _admin = obj.get('admin') if obj and 'admin' in obj else None
        _superAdmin = obj.get('superAdmin') if obj and 'superAdmin' in obj else None
        _impersonateId = obj.get('impersonateId') if obj and 'impersonateId' in obj else None
        _devUser = obj.get('devUser') if obj and 'devUser' in obj else None
        _updatedAt = obj.get('updatedAt') if obj and 'updatedAt' in obj else None
        _createdAt = obj.get('createdAt') if obj and 'createdAt' in obj else None
        return RawRockItApiUser(_id, _username, _passwordHash, _lists, _lastPlayedSong, _currentSong, _currentStation, _currentTime, _queue, _queueIndex, _randomQueue, _repeatSong, _likedSongs, _pinnedLists, _volume, _crossFade, _lang, _admin, _superAdmin, _impersonateId, _devUser, _updatedAt, _createdAt, obj)
    def __getitem__(self, item):
        if item == 'id':
            return self.id
        elif item == 'username':
            return self.username
        elif item == 'passwordHash':
            return self.passwordHash
        elif item == 'lists':
            return self.lists
        elif item == 'lastPlayedSong':
            return self.lastPlayedSong
        elif item == 'currentSong':
            return self.currentSong
        elif item == 'currentStation':
            return self.currentStation
        elif item == 'currentTime':
            return self.currentTime
        elif item == 'queue':
            return self.queue
        elif item == 'queueIndex':
            return self.queueIndex
        elif item == 'randomQueue':
            return self.randomQueue
        elif item == 'repeatSong':
            return self.repeatSong
        elif item == 'likedSongs':
            return self.likedSongs
        elif item == 'pinnedLists':
            return self.pinnedLists
        elif item == 'volume':
            return self.volume
        elif item == 'crossFade':
            return self.crossFade
        elif item == 'lang':
            return self.lang
        elif item == 'admin':
            return self.admin
        elif item == 'superAdmin':
            return self.superAdmin
        elif item == 'impersonateId':
            return self.impersonateId
        elif item == 'devUser':
            return self.devUser
        elif item == 'updatedAt':
            return self.updatedAt
        elif item == 'createdAt':
            return self.createdAt
        return None


def main():
    
    user = {
    "id": "kor0r3n05o6ihak3",
    "username": "icass",
    "passwordHash": "$argon2id$v=19$m=19456,t=2,p=1$sbkjLyB5Eq3EdiXrNWLU3w$T75KQTst2VAuZ0tNrH5XXqCWpcG9d+Ltw3SIO1kCc90",
    "lists": [
        {
            "createdAt": 1733398185209,
            "type": "playlist",
            "id": "PLBie5MnWPCb3Ho0U-Uzhja1Ef3CSKr6Sa"
        },
        {
            "createdAt": 1733398444041,
            "type": "album",
            "id": "4X87hQ57jTYQTcYTaJWK5w"
        },
        {
            "createdAt": 1733573148560,
            "type": "playlist",
            "id": "3u4naniXCbTKLVPabZLrnq"
        },
        {
            "createdAt": 1733581768445,
            "type": "playlist",
            "id": "7h6r9ScqSjCHH3QozfBdIq"
        },
        {
            "createdAt": 1733597491391,
            "type": "playlist",
            "id": "0kqz3FKC3yz3L1sJTqmRCh"
        },
        {
            "createdAt": 1733844586248,
            "type": "album",
            "id": "5JLKZcOSNXcm6xaX1vI7nB"
        },
        {
            "createdAt": 1733846886237,
            "type": "album",
            "id": "0ETFjACtuP2ADo6LFhL6HN"
        },
        {
            "createdAt": 1734014021532,
            "type": "album",
            "id": "1Jv2AqzhgsduUik2p4k3cS"
        },
        {
            "createdAt": 1737590186244,
            "type": "album",
            "id": "2ZytN2cY4Zjrr9ukb2rqTP"
        },
        {
            "createdAt": 1740312649695,
            "type": "album",
            "id": "7rfpaXxmQG7dnFycZjLae0"
        },
        {
            "createdAt": 1740312748345,
            "type": "album",
            "id": "5TNzBp7QYsXIHrI5xxVuic"
        },
        {
            "createdAt": 1740312754899,
            "type": "album",
            "id": "6fQElzBNTiEMGdIeY0hy5l"
        },
        {
            "id": "vf18c98a6oac2fam",
            "type": "playlist",
            "createdAt": 1741621832953
        },
        {
            "id": "cfw2roirpu2ts7mm",
            "type": "playlist",
            "createdAt": 1741621960083
        }
    ],
    "lastPlayedSong": {
        "72hA6rKUIc8sI2Bb0eB7AY": [
            1733436568989
        ],
        "4IRHwIZHzlHT1FQpRa5RdE": [
            1733595368534
        ],
        "4oXPKd1nCTONb2O9NEWjUn": [
            1733595686550
        ],
        "7HKez549fwJQDzx3zLjHKC": [
            1733693389643,
            1733693416769,
            1739997368347
        ],
        "2cX2coZS1PYBfPs8wgbdWE": [
            1733699982276,
            1739997682892
        ],
        "15ob9SMGLWrexuPuyuMjKl": [
            1733700850567,
            1737115071563
        ],
        "1Jp0vQZhLa7YCOBdb5frOM": [
            1733700985336
        ],
        "26TsScuJSlqwZyaoWG2l7u": [
            1734011097440,
            1739992605906,
            1740315453174
        ],
        "3yfqSUWxFvZELEM4PmlwIR": [
            1734018630537
        ],
        "3zR16RvuoDiglmh4iTacvN": [
            1734018993713
        ],
        "1EJIEPzahlUiev5IQ1HnuL": [
            1734019248153
        ],
        "6XUHsYE38CEbYunT983O9G": [
            1734041387246,
            1739998151593,
            1740090345832
        ],
        "7zRmGvtSy36Jr19U5OInJT": [
            1734549244623
        ],
        "7j74lucZ59vqN67Ipe2ZcY": [
            1736784829903
        ],
        "44eHBZslXM0IdN948uSRWj": [
            1736785066653
        ],
        "2B8UVVY69xM1HrqVspYdJF": [
            1736797718317
        ],
        "0B5kY9i9bmP7554oU4jRoO": [
            1736797956586
        ],
        "63rva3TBizr6x1Yp5uwKfD": [
            1736798119523
        ],
        "5gLJZBGkpvRXWbEbTcLIz8": [
            1737063906251,
            1737064028020,
            1737064030542,
            1737065199732,
            1737065843302,
            1737065847494,
            1737065851269,
            1737065868164,
            1737065880818,
            1737066512078,
            1737067148355,
            1737067162584,
            1737067216855,
            1737067235942,
            1737067338766,
            1737067525445,
            1737067564263,
            1737067566669,
            1737067668892,
            1737067671506,
            1737067689411,
            1737067801667,
            1737067803933,
            1737067806419,
            1737067835342,
            1737067838993,
            1737068154230,
            1737068156209,
            1737068196963,
            1737068201101,
            1737068203813,
            1739990398828
        ],
        "3ZpQiJ78LKINrW9SQTgbXd": [
            1737115532579
        ],
        "3Z25k4ZF6QENy2d9YatsM5": [
            1737117317507,
            1737205826842
        ],
        "2S8xyNRJX1XQdo3qnTuovI": [
            1737117544650,
            1737206116974
        ],
        "1FTCA6wQwulQFokDddKE68": [
            1737117617822,
            1737206190241
        ],
        "6UCFZ9ZOFRxK8oak7MdPZu": [
            1737117644267,
            1737206216802
        ],
        "4JOyMhad5dD81uGYLGgKrS": [
            1737117713359,
            1737206287927
        ],
        "4nwKdZID1ht0lDBJ5h2p87": [
            1737117884741,
            1737206436051
        ],
        "0pNeVovbiZHkulpGeOx1Gj": [
            1737118140331,
            1737206619073
        ],
        "2jtUGFsqanQ82zqDlhiKIp": [
            1737203073507,
            1737206738382
        ],
        "1rxoyGj1QuPoVi8fOft1Kt": [
            1737203240067,
            1737206910021
        ],
        "0suLngfo7rJoetk7Ub6N8l": [
            1737203428398,
            1737207089701
        ],
        "2mxByJWOajjiVsLWjNXvDJ": [
            1737203641279,
            1737207362485
        ],
        "6dGnYIeXmHdcikdzNNDMm2": [
            1737204038248,
            1737207603217
        ],
        "2EqlS6tkEnglzr7tkKAAYD": [
            1737204452435
        ],
        "1jOLTO379yIu9aMnCkpMQl": [
            1737204713733
        ],
        "5aHHf6jrqDRb1fcBmue2kn": [
            1737204861545
        ],
        "5eZrW59C3UgBhkqNlowEID": [
            1737204960538
        ],
        "01SfTM5nfCou5gQL70r6gs": [
            1737205053363
        ],
        "22sLuJYcvZOSoLLRYev1s5": [
            1737208745766,
            1740002313420
        ],
        "38WMtbgQb567LNFoFCXZyn": [
            1737208970933
        ],
        "4YwbSZaYeYja8Umyt222Qf": [
            1737209153056
        ],
        "69QHm3pustz01CJRwdo20z": [
            1737209852949,
            1741633482017,
            1741634148758,
            1741635403488,
            1741635468350
        ],
        "1J5XEPamp7iQaCU0aFuMnd": [
            1737230873829
        ],
        "0bRXwKfigvpKZUurwqAlEh": [
            1737231210615
        ],
        "3FAclTFfvUuQYnEsptbK8w": [
            1737231226974
        ],
        "1EzrEOXmMH3G43AXT1y7pA": [
            1737231252129
        ],
        "2RlgNHKcydI9sayD2Df2xp": [
            1737231267984,
            1737231273885
        ],
        "57hJxdJGm8kZMU0xPGNBAA": [
            1737231285508
        ],
        "798fUF6UnRn27xiVuKyJCi": [
            1737231289626
        ],
        "6xdLJrVj4vIXwhuG8TMopk": [
            1737231300187,
            1737231359796,
            1737231594920
        ],
        "4qlfHfF422rd3I1FOs6N4s": [
            1737233034857
        ],
        "4ZmjfLdJXbqjAENqk7eWSE": [
            1737485667903
        ],
        "6BdiFsPMPkSEEO4fFXFVWX": [
            1738006437124
        ],
        "78XG7U0UueeC86XpzF9O7f": [
            1738006679835,
            1738006860136
        ],
        "3zYpRGnnoegSpt3SguSo3W": [
            1738007489214
        ],
        "7LRMbd3LEoV5wZJvXT1Lwb": [
            1739454705668,
            1740001865518
        ],
        "0C80GCp0mMuBzLf3EAXqxv": [
            1739456121699
        ],
        "6XdPkXzktPNXpOqGjFp90I": [
            1739990980977
        ],
        "7hHTyS1QG0TcX5iQ0sa1Tk": [
            1739991393776
        ],
        "5ORq8jzBuQ3gLZQpe6Vs5r": [
            1739991849392
        ],
        "3AUpYeScJOpYf8psTIz62l": [
            1739992079214
        ],
        "43BVfHr7mkNDtNIGVp1vff": [
            1739992345295
        ],
        "4a5pNRjwmzYQuEY1E7O6pj": [
            1739992786009,
            1741615919426,
            1741634455214
        ],
        "3bdcWJPfW9Xxb78BAUiBuf": [
            1739992990812
        ],
        "0v0XYK0pLgsPiq5u4FKHaw": [
            1739993270036
        ],
        "3O0BsyGfLcjhraBRz2Icvd": [
            1739993628899
        ],
        "4zuUbVOygkYUQkoYIO3DAP": [
            1739993954704
        ],
        "2YkZ06KjaXlqAyGKxXKj21": [
            1739994545948
        ],
        "5KTAVQ1TVPOasRCrqE1XiW": [
            1739994978515
        ],
        "2G05yFyVGPLPMOtRciS9Tr": [
            1739995369819
        ],
        "089NMLhXz421ohFN55A3yo": [
            1739995656829
        ],
        "6mHOcVtsHLMuesJkswc0GZ": [
            1739995883789,
            1740315310586
        ],
        "12etwAqhjJJrZdGrsQ9Wff": [
            1739997132920
        ],
        "1swmf4hFMJYRNA8Rq9PVaW": [
            1739997529590
        ],
        "1QEEqeFIZktqIpPI4jSVSF": [
            1739997903829
        ],
        "7e89621JPkKaeDSTQ3avtg": [
            1739998546515
        ],
        "1BY1Vd2Bt6JPOhMvsIwtVv": [
            1739998859267
        ],
        "1vxw6aYJls2oq3gW0DujAo": [
            1739999108876
        ],
        "6BJTagJUFeUxHpVWxTmatw": [
            1739999315785
        ],
        "1qDrWA6lyx8cLECdZE7TV7": [
            1739999556046
        ],
        "1lCRw5FEZ1gPDNPzy1K4zW": [
            1739999748431
        ],
        "745H5CctFr12Mo7cqa1BMH": [
            1739999899506
        ],
        "7rIovIsXE6kMn629b7kDig": [
            1740000392623
        ],
        "2QfiRTz5Yc8DdShCxG1tB2": [
            1740000597034
        ],
        "1I6q6nwNjNgik1Qe8Oi0Y7": [
            1740003086081
        ],
        "5WDLRQ3VCdVrKw0njWe5E5": [
            1740003414866,
            1740003449455
        ],
        "7w2s5Wj0LPNhUkVCt8av09": [
            1740091215545
        ],
        "7hDQerpfE5FgYtVKEVemwl": [
            1740091831369
        ],
        "4OSZGBSgURF74RO0dRA8HY": [
            1740092363680
        ],
        "40uqC6osBbNPm4jEN3OsAl": [
            1740141121087
        ],
        "0FfZBWDv7p63yj6oh2I2PS": [
            1740141939307
        ],
        "7DHbdwzeWMLc5M9BLXGmZ3": [
            1740142370817
        ],
        "2bzBI23EJWHjXmGj3xlYaM": [
            1740142596364
        ],
        "0An7JdAquJDVSwz4T6r8fN": [
            1740142805491
        ],
        "0ldE7rHWykc9OUViCzdviV": [
            1740143504088
        ],
        "7Js4OF5MUb2bqJe09g4uQE": [
            1740314068228,
            1740480012253
        ],
        "0LrwgdLsFaWh9VXIjBRe8t": [
            1740314407770,
            1740479806060,
            1740479846037
        ],
        "3ZE3wv8V3w2T2f7nOCjV0N": [
            1740314699030,
            1740491124797,
            1741199767742
        ],
        "6AI3ezQ4o3HUoP6Dhudph3": [
            1740315050228
        ],
        "76CfWxdNh9k5ssABTxlmMJ": [
            1740490918664
        ],
        "63PgfGFgAZUEzwGouciEC5": [
            1740491396305
        ],
        "1w3W1hz6xVUSWkbh0paMgs": [
            1740491637130
        ],
        "1p4krvaKEJWr3ou3D5IZQy": [
            1740491819370
        ],
        "0SfYZJSWk4h00yzheOgeIQ": [
            1740492032205
        ],
        "16GUMo6u3D2qo9a19AkYct": [
            1740736906908
        ],
        "7oOOI85fVQvVnK5ynNMdW7": [
            1741200243476
        ],
        "7kv7zBjMtVf0eIJle2VZxn": [
            1741200444000
        ],
        "0qxYx4F3vm1AOnfux6dDxP": [
            1741200720556
        ],
        "0pQskrTITgmCMyr85tb9qq": [
            1741200988770
        ],
        "20kN7bu0HMO8rIVY6tEytW": [
            1741201236481
        ],
        "6o8nZVzweaEOLDLOgaogX5": [
            1741616928897
        ],
        "72ahyckBJfTigJCFCviVN7": [
            1741624654117
        ],
        "5zA8vzDGqPl2AzZkEYQGKh": [
            1741634633883,
            1741635168190
        ],
        "57bgtoPSgt236HzfBOd8kj": [
            1741634923018
        ],
        "2mlGPkAx4kwF8Df0GlScsC": [
            1741689677318
        ],
        "1Wyy0qQ2fPEnx7aY5Wj4CK": [
            1741810635640
        ],
        "6B8czH1kJLkcihMhFdr6Xp": [
            1742302603455
        ]
    },
    "currentSong": "6XUHsYE38CEbYunT983O9G",
    "currentStation": None,
    "currentTime": 1.216495,
    "queue": [],
    "queueIndex": 0,
    "randomQueue": 0,
    "repeatSong": 0,
    "likedSongs": [
        {
            "createdAt": 1734007844901,
            "id": "2i7WqpFuyQhU6CHQWthVTM"
        },
        {
            "createdAt": 1734008005215,
            "id": "44eHBZslXM0IdN948uSRWj"
        },
        {
            "createdAt": 1734008094482,
            "id": "5KiDWqKsU0EfXQJdnWSOn9"
        },
        {
            "createdAt": 1734010850504,
            "id": "67oyFnjJnn78fZP9KjeZx0"
        },
        {
            "createdAt": 1734015335967,
            "id": "15joiMls8SpP1VtGivYh6i"
        },
        {
            "createdAt": 1734016151235,
            "id": "3yfqSUWxFvZELEM4PmlwIR"
        },
        {
            "createdAt": 1734038788842,
            "id": "6XUHsYE38CEbYunT983O9G"
        },
        {
            "createdAt": 1734219662532,
            "id": "6mHOcVtsHLMuesJkswc0GZ"
        },
        {
            "createdAt": 1734288074221,
            "id": "7hHTyS1QG0TcX5iQ0sa1Tk"
        },
        {
            "createdAt": 1734288074743,
            "id": "5gLJZBGkpvRXWbEbTcLIz8"
        },
        {
            "createdAt": 1734344241803,
            "id": "4OSZGBSgURF74RO0dRA8HY"
        },
        {
            "createdAt": 1734378402199,
            "id": "089NMLhXz421ohFN55A3yo"
        },
        {
            "createdAt": 1734378420987,
            "id": "3AUpYeScJOpYf8psTIz62l"
        },
        {
            "createdAt": 1734378659466,
            "id": "26TsScuJSlqwZyaoWG2l7u"
        },
        {
            "createdAt": 1734387422811,
            "id": "2YkZ06KjaXlqAyGKxXKj21"
        },
        {
            "added_at": "2025-01-15T14:07:35Z",
            "id": "4a5pNRjwmzYQuEY1E7O6pj"
        },
        {
            "added_at": "2025-01-15T14:09:31Z",
            "id": "6o8nZVzweaEOLDLOgaogX5"
        },
        {
            "added_at": "2025-01-18T13:47:46Z",
            "id": "3hJLKtTpgct9Y9wKww0BiR"
        },
        {
            "added_at": "2025-01-18T14:15:20Z",
            "id": "7LRMbd3LEoV5wZJvXT1Lwb"
        },
        {
            "added_at": "2025-01-27T19:09:13Z",
            "id": "46eu3SBuFCXWsPT39Yg3tJ"
        },
        {
            "added_at": "2025-02-21T10:15:30Z",
            "id": "2S8xyNRJX1XQdo3qnTuovI"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "17lu4tymfnhmcIDlzBbtAb"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "3zR16RvuoDiglmh4iTacvN"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "1EJIEPzahlUiev5IQ1HnuL"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "6Th6ND8RQPywiyelecP5Lf"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "2SiXAy7TuUkycRVbbWDEpo"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "69QHm3pustz01CJRwdo20z"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "08mG3Y1vljYA6bvDt4Wqkj"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "4xkOaSrkexMciUUogZKVTS"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "57bgtoPSgt236HzfBOd8kj"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "2zYzyRzz6pRmhPzyfMEC8s"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "0C80GCp0mMuBzLf3EAXqxv"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "23wfXwnsPZYe5A1xXRHb3J"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "4EQkcrSLF3QdlwNca7sMXY"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "6Db8IlZ7YY1pfIjJllejyH"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "0x60P5taxdI5pcGbqbap6S"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "6or1bKJiZ06IlK0vFvY75k"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "7BMO7O7ImjV8HNTH74Tshv"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "3F14hbIqy1JKKLTb1mzdYV"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "561jH07mF1jHuk7KlaeF0s"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "4woTEX1wYOTGDqNXuavlRC"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "5H3B1WtZYGmyOYOXgQltKU"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "3CpoeW0cZSDzIRv5z34F87"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "7FIWs0pqAYbP91WWM0vlTQ"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "6kUaRtXf19fu5IQWjmwsEJ"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "5ahPl557niKxia8Kquw1yh"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "27mgDrExPa3obPAYXd3yQg"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "7lQ8MOhq6IN2w8EYcFNSUk"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "5eGEc27nnhtmcOh6RC890a"
        },
        {
            "added_at": "2025-02-21T11:15:57Z",
            "id": "5QD28FqaM3jTfsqWwvRZwv"
        },
        {
            "added_at": "2025-02-23T12:29:59Z",
            "id": "7Js4OF5MUb2bqJe09g4uQE"
        }
    ],
    "pinnedLists": [
        {
            "createdAt": 1733397525642,
            "type": "album",
            "id": "1zcm3UvHNHpseYOUfd0pna"
        },
        {
            "createdAt": 1733397951301,
            "type": "album",
            "id": "4X87hQ57jTYQTcYTaJWK5w"
        },
        {
            "createdAt": 1733398147635,
            "type": "playlist",
            "id": "PLBie5MnWPCb3Ho0U-Uzhja1Ef3CSKr6Sa"
        },
        {
            "createdAt": 1733573149383,
            "type": "playlist",
            "id": "3u4naniXCbTKLVPabZLrnq"
        },
        {
            "createdAt": 1733581769436,
            "type": "playlist",
            "id": "7h6r9ScqSjCHH3QozfBdIq"
        },
        {
            "createdAt": 1733597492006,
            "type": "playlist",
            "id": "0kqz3FKC3yz3L1sJTqmRCh"
        },
        {
            "createdAt": 1733694189528,
            "type": "album",
            "id": "1Jv2AqzhgsduUik2p4k3cS"
        },
        {
            "createdAt": 1736784262704,
            "type": "album",
            "id": "5JLKZcOSNXcm6xaX1vI7nB"
        },
        {
            "createdAt": 1740313770325,
            "type": "album",
            "id": "6fQElzBNTiEMGdIeY0hy5l"
        }
    ],
    "volume": 1,
    "crossFade": 0,
    "lang": "en",
    "admin": 1,
    "superAdmin": 0,
    "impersonateId": "0",
    "devUser": 0,
    "updatedAt": 1733337255413,
    "createdAt": 1733337255413
}
    user = RawRockItApiUser.from_dict(user)
    
    print(user.lastPlayedSong["6B8czH1kJLkcihMhFdr6Xp"])

if __name__ == "__main__":
    main()