var CommandBuffer
protobuf.load("../proto/CommandBuffer.proto", function(err, root) {
  if (err)
    throw err;
  
  // Obtain a message type
  CommandBuffer = root.lookupType("redhatgamedev.srt.CommandBuffer");

});
