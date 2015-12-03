#include "opencv\highgui.h"
#include <iostream>
#include "DICOMParser.h"

using namespace cv;
using namespace std;

int main(int argc, char** argv)
{
	DICOMParser parser = DICOMParser("C:\\Head_F");

	return 0;
}

