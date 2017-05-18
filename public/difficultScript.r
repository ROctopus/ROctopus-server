# Test script that uses a long computation on some .Rdata file
args <- commandArgs(trailingOnly = TRUE)
inpLocation <- args[1]
outLocation <- args[2]
runID <- args[3]

load(inpLocation)

# extremely difficult computation
out <- character(length(df))
for (i in df){
  out[i] <- paste0("id ", runID, "  at  ", Sys.time())
  Sys.sleep(0.3)
}

# save the result
save(out, file = outLocation)