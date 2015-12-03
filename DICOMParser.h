//GRA Praktikum 2, Michael M und Sven M

#pragma once
#include <string>
#include <iostream>
#include <fstream>

#include "opencv2\opencv.hpp"
#include "opencv\highgui.h"
#include "opencv\cxcore.h"

using namespace std;
using namespace cv;

class DICOMParser{
private:
	string environment;

	string getAbsolutePath(string path, string prefix, string suffix, int number){
		stringstream out;
		out << path << "\\" << prefix << "." << to_string(number) << "." << suffix;
		return out.str();
	}

	string getDirectory(const string& path)
	{
		size_t found = path.find_last_of("/\\");
		return(path.substr(0, found));
	}

	void readImage(string path, Mat& mat)
	{
		ifstream stream(path, ifstream::binary);
		if (stream) {
			stream.seekg(0, stream.end);
			int length = stream.tellg();

			int seek = length - (512 * 512) * 2;
			stream.seekg(seek);

			mat.create(Size(512, 512), CV_16U);
			stream.read((char *)mat.data, length - seek);
			stream.close();
		}
	}

	void scaleImage(Mat& mat, Mat& scaled){
		double minVal;
		double maxVal;

		minMaxLoc(mat, &minVal, &maxVal);

		double scale = 255 / (maxVal - minVal);
		double shift = -minVal * scale;

		convertScaleAbs(mat, scaled, scale, shift);

	}

	void segmentImage(double th, Mat& image, Mat& bin){
		image.convertTo(image, CV_32F);
		GaussianBlur(image, bin, cv::Size(5, 5), 2.0, 0);
		threshold(image, bin, th, 255, 0);
		medianBlur(bin, bin, 5);

		bin.convertTo(bin, CV_8UC1);
	}

	vector<vector<Point>> extractEdges(Mat& bin){
		vector<vector<Point>> out;
		findContours(bin, out, CV_RETR_EXTERNAL, CV_CHAIN_APPROX_NONE);
		return out;
	}

	string toJSON(vector<Point3i> image,vector<Point3i> smalerimmage,vector<Point3i> indices){
		
		for (int i = 0; i != smalerimmage.size(); i++){
			image.push_back(smalerimmage[i]);
		}
		
		stringstream out;


		out << "{ \n";

		out << "\t\"vertices\" : [\n" << "\t\t";
		
		for (int k = 0; k != image.size(); k++){
			out << image[k].x << ", " << image[k].y << ", " << image[k].z;
			if (k < image.size()-1){
				out << ", ";
			}
		}
			
			
		out << "\n\t]\n}";

		
		out << "\t\"indices\" : [\n" << "\t\t";
		
		for (int k = 0; k != indices.size(); k++){
			out << indices[k].x << ", " << indices[k].y << ", " << indices[k].z;
			if (k < indices.size()-1){
				out << ", ";
			}
		}
			
		out << "\n\t]\n}";

		return out.str();
	}

	void writeToFile(string path, string content){
		ofstream file;
		file.open(path);
		file << content;
		file.close();
	}

	void preprocessImage(vector<Point>& edges,int layer){
				
		Mat image;
		readImage(getAbsolutePath(environment, "vhf", "dcm", layer), image);

		Mat segment;
		segmentImage(600, image, segment);

		vector<vector<Point>> alledges = extractEdges(segment);
		for (int i = 0; i < alledges.size(); i++){
			for (int j = 0; j < alledges[i].size(); j++){
				edges.push_back(alledges[i][j]);
			}
		}

		/*
		Mat scaled;
		scaleImage(image, scaled);
		imshow("Vorschau Skaliert", scaled);

		imshow("Vorschau Segmentiert", segment);
		cout << to_string(i);
		system("cls");
		waitKey(0);
		*/
	}

	void calculateIndices(vector<Point> biggerImage,vector<Point> smallerImage,vector<Point3i>& indices){
		for (int i = 0; i < biggerImage.size(); i++){

			Point A = biggerImage[i];
			double bestDistance = 99999;
			int bestIndiceB = -1;	

			for(int k = 0;k < smallerImage.size();k++){
				Point tempB = smallerImage[k];
				double distance = sqrt(pow((A.x-tempB.x),2)+pow((A.y-tempB.y),2));
							
				if(distance < bestDistance){
					bestDistance = distance;
					bestIndiceB = k;
				}
			}
						
			if(bestIndiceB != -1 && bestDistance < 10){
				Point B = smallerImage[bestIndiceB];

				int indiceA = i;
				int indiceB = indiceA + bestIndiceB;
							
				Point3i firstTriangle = Point3i(indiceA,indiceB,indiceB+1);
				Point3i secondTriangle = Point3i(indiceA,indiceB+1,indiceA+1);
							
				//cout << A << " : " << B <<" = "<<bestDistance << "\n";
				//cout << firstTriangle << " , " << secondTriangle << "\n";

				//getchar();
				
				indices.push_back(firstTriangle);
				indices.push_back(secondTriangle);

			}
		}
	}

	vector<Point3i> toPoint3i(vector<Point> v, int z) {
		vector<Point3i> out;
		for (int i = 0; i < v.size(); i++) {
			out.push_back(Point3i(v[i].x, v[i].y, z));
		}
		return out;
	}

public:
	DICOMParser(string environment){
		this->environment = environment;

		int start = 1501;
		int end = 1735;

		for (int layer = start; layer < end; layer++){
			int i = layer - start;
			
			vector<Point> image;
			preprocessImage(image,layer);

			
			vector<Point3i> indices;
			string JSON;

			if(layer + 1 < end){
				vector<Point> nextimage;
				preprocessImage(nextimage,layer + 1);

				vector<Point3i> iv = toPoint3i(image, i);
				vector<Point3i> niv = toPoint3i(nextimage, i+1);


				if(image.size() <= nextimage.size()){
					calculateIndices(nextimage,image,indices);
					JSON = toJSON(niv, iv,indices);
				}else{
					calculateIndices(image,nextimage,indices);
					JSON = toJSON(iv, niv,indices);
				}
			}

			writeToFile(getAbsolutePath(environment, "vhf", "json", layer), JSON);
		}

		waitKey(35);
	}
};
