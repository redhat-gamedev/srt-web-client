var box2dProto_PbVec2
protobuf.load("../proto/box2d.proto", function(err, root) {
  if (err)
    throw err;
  
  // Obtain a message type
  box2dProto_PbVec2 = root.lookupType("box2d.PbVec2");

});