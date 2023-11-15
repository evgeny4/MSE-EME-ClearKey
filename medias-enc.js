var streamMedias = {
    "simpleClearKeyMSE" : {    video : {    initDataType : "cenc",
                                            mimeType     : 'video/mp4; codecs="avc1.64001F"',
                                            segments     : [ "media/cbcs_clearkey/media_frag_video_cenc.mp4" ],
                                            keys         : {    "d0d1d2d3d4d5d6d7d8d9dadbdcdddedf" : "c0c1c2c3c4c5c6c7c8c9cacbcccdcecf" }
                                       },
 				audio : {   initDataType : "cenc",
                                            mimeType     : 'audio/mp4; codecs="mp4a.40.2"',
                                            segments     : [ "media/cbcs_clearkey/media_frag_audio_cenc.mp4" ],
                                            keys         : {   	"b0b1b2b3b4b5b6b7b8b9babbbcbdbebf" : "a0a1a2a3a4a5a6a7a8a9aaabacadaeaf" }
                                       }
                          }
    }
