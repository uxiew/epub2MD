// @ts-nocheck  have some Error!
import fs from 'fs'
import Packer from 'pypacker'

export default class Mobi {
  filename: string
  info = {
    content: '',
    pdbHeader: {
      records: [],
    },
    mobiHeader: {},
  }

  constructor(filename: string) {
    this.filename = filename
    this.parse()
  }

  parse() {
    var bufIndex,
      buffer,
      data,
      fd,
      file_info,
      filename,
      flags,
      header,
      id,
      index,
      mobiHeader,
      multibyte,
      pdbHeader,
      position,
      startPosition,
      trailers,
      _i,
      _j,
      _ref,
      _ref1,
      _ref2,
      _ref3,
      _ref4,
      _ref5,
      _ref6,
      _ref7
    filename = this.filename
    file_info = fs.statSync(filename)
    buffer = new Buffer(file_info.size)
    fd = fs.openSync(filename, 'r')
    fs.readSync(fd, buffer, 0, file_info.size, 0)
    pdbHeader = this.info.pdbHeader

    _ref = new Packer('31sxHH6I4s4s2IH').unpack_from(buffer)

    this.info.name = _ref[0]
    pdbHeader.attributes = _ref[1]
    pdbHeader.version = _ref[2]
    pdbHeader.created = _ref[3]
    pdbHeader.modified = _ref[4]
    pdbHeader.backedUp = _ref[5]
    pdbHeader.modificationNumber = _ref[6]
    pdbHeader.appInfoId = _ref[7]
    pdbHeader.sortInfoID = _ref[8]
    pdbHeader.type = _ref[9]
    pdbHeader.creator = _ref[10]
    pdbHeader.uniqueIDseed = _ref[11]
    pdbHeader.nextRecordListID = _ref[12]
    pdbHeader.recordCount = _ref[13]
    this.info.name = this.info.name.replace(/\u0000/g, '')
    pdbHeader.created = new Date(pdbHeader.created * 1000)
    pdbHeader.modified = new Date(pdbHeader.modified * 1000)
    pdbHeader.backedUp = new Date(pdbHeader.backedUp * 100)
    bufIndex = 0x4e

    for (
      index = _i = 0, _ref1 = pdbHeader.recordCount;
      0 <= _ref1 ? _i < _ref1 : _i > _ref1;
      index = 0 <= _ref1 ? ++_i : --_i
    ) {
      startPosition = bufIndex + index * 8
        ; (_ref2 = new Packer('II').unpack_from(buffer, startPosition)),
          (position = _ref2[0]),
          (id = _ref2[1])
      id = id & 0x00ffffff
      pdbHeader.records.push({
        position: position,
        id: id,
      })
    }
    header = buffer.slice(pdbHeader.records[0].position, pdbHeader.records[1].position)
    mobiHeader = this.info.mobiHeader;

    _ref3 = new Packer('H2xI3H6x3I').unpack_from(header);

    mobiHeader.compression = _ref3[0]
    mobiHeader.text_length = _ref3[1]
    mobiHeader.textRecordCount = _ref3[2]
    mobiHeader.recordSize = _ref3[3]
    mobiHeader.encryption = _ref3[4]
    mobiHeader.headerLength = _ref3[5]
    mobiHeader.mobiType = _ref3[6]
    mobiHeader.encoding = _ref3[7]

    _ref4 = new Packer('3I').unpack_from(header, 0x50)
    mobiHeader.firstNonBookIndex = _ref4[0]
    mobiHeader.fullNameOffset = _ref4[1]
    mobiHeader.fullNameLength = _ref4[2]
    mobiHeader.firstImageIndex = new Packer('I').unpack_from(header, 0x6c)[0]
    mobiHeader.exthFlags = new Packer('I').unpack_from(header, 0x80)[0]
    mobiHeader.exthFlags = (mobiHeader.exthFlags & 0x40) === 0x40 ? true : false;

    _ref5 = new Packer('2H').unpack_from(header, 0xc2)
    mobiHeader.firstContentRecord = _ref5[0]

    mobiHeader.lastContentRecord = _ref5[1];
    this.info.title = new Packer(mobiHeader.fullNameLength + 's').unpack_from(
      header,
      mobiHeader.fullNameOffset,
    )[0]

    multibyte = 0
    trailers = 0
    if (mobiHeader.headerLength >= 0xe4) {
      flags =
        ((_ref6 = new Packer('H').unpack_from(header, 0xf2)), (mobiHeader.flags = _ref6[0]), _ref6)
      multibyte = flags & 1
      while (flags > 1) {
        trailers += 1
        flags = flags & (flags - 2)
      }
    }
    for (
      position = _j = 1, _ref7 = mobiHeader.textRecordCount;
      1 <= _ref7 ? _j <= _ref7 : _j >= _ref7;
      position = 1 <= _ref7 ? ++_j : --_j
    ) {
      data = buffer.slice(
        pdbHeader.records[position].position,
        pdbHeader.records[position + 1].position,
      )
      data = this.trim(data, trailers, multibyte)
      if (mobiHeader.compression === 1) {
        this.info.content += data
      } else if (mobiHeader.compression === 2) {
        this.info.content += this.palmdocReader(data)
      } else {
        throw new Error("LZ77 compression isn't supported... yet.")
      }
    }

    this.info.content = this.info.content.replace(
      /<(head|HEAD)>/g,
      '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>',
    )
    return this
  }

  trim(data: Buffer, trailers: number, multibyte: number) {
    var end_bytes, num, v, z, _i, _j
    for (
      z = _i = 0;
      0 <= trailers ? _i < trailers : _i > trailers;
      z = 0 <= trailers ? ++_i : --_i
    ) {
      num = 0
      end_bytes = data.slice(data.length - 4)
      for (v = _j = 0; _j < 4; v = ++_j) {
        if (end_bytes[v] & 0x80) {
          num = 0
        }
        num = (num << 7) | (end_bytes[v] & 0x7f)
      }
      data = data.slice(0, data.length - num)
    }
    if (multibyte) {
      num = (data[data.length - 1] & 3) + 1
      data = data.slice(0, data.length - num)
    }
    return data
  }

  palmdocReader(data: Buffer) {
    var concat, distance, frame, index, length, string, x, _i, _j, _ref
    string = ''
    index = 0
    while (index < data.length) {
      frame = data[index]
      index += 1
      if (frame >= 1 && frame <= 8) {
        string += data.toString('utf8', index, index + frame)
        for (
          x = _i = 0, _ref = frame - 1;
          0 <= _ref ? _i < _ref : _i > _ref;
          x = 0 <= _ref ? ++_i : --_i
        ) {
          string += String.fromCharCode(0xe0e0)
        }
        index += frame
      } else if (frame < 128) {
        string += String.fromCharCode(frame)
      } else if (frame >= 192) {
        string += ' ' + String.fromCharCode(frame ^ 128)
      } else {
        concat = (frame << 8) | data[index]
        distance = (concat >> 3) & 0x07ff
        length = (concat & 7) + 3
        if (length < distance) {
          string += string.slice(-distance, length - distance)
        } else {
          for (x = _j = 0; 0 <= length ? _j < length : _j > length; x = 0 <= length ? ++_j : --_j) {
            string += string[string.length - distance]
          }
        }
        index += 1
      }
    }
    string = string.replace(/\uE0E0/g, '')
    return string
  }
}
