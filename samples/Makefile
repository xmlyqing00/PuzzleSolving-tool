CXXFLAGS= -std=c++11 -O3 -Wall
OPENCV_INC = `pkg-config opencv --cflags`
OPENCV_LIB = `pkg-config opencv --libs`

INCS = $(OPENCV_INC)
LIBS = $(OPENCV_LIB)

default: read_puzzle
.PHONY: clean

read_puzzle: read_puzzle.o Makefile
	g++ $< -g -o $@ $(CXXFLAGS) $(LIBS) 

%.o: %.cpp Makefile
	g++ $< -c -g $(CXXFLAGS) $(INCS)

clean:
	rm -f *.o read_puzzle