var SecurityCommandBuffer
protobuf.load("../proto/SecurityCommandBuffer.proto", function(err, root) {
  if (err)
    throw err;

  // Obtain message type
  SecurityCommandBuffer = root.lookupType("redhatgamedev.srt.SecurityCommandBuffer");
});