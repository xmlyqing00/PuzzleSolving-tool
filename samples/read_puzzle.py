import os
import json
import math
import numpy as np
import cv2


class Puzzle:

    def __init__(self, puzzle_path):
        
        self.puzzle_path = puzzle_path

        # Read config
        config_path = os.path.join(self.puzzle_path, 'config.txt')
        file = open(config_path)

        self.prefix = file.readline().strip()
        self.puzzle_n = int(file.readline())
        bg_color_arr = file.readline().strip().split(' ')
        self.bg_color = [int(bg_color_arr[0]), int(bg_color_arr[1]), int(bg_color_arr[2])]

        file.close()

        print('Prefix:', self.prefix)
        print('Piece num:', self.puzzle_n)
        print('Puzzle path:', puzzle_path)
        print('Background color:', self.bg_color)

        # Read pieces
        self.pieces = []
        for i in range(self.puzzle_n):
            self.pieces.append(self.read_piece(i))
        
        self.piece_size = self.pieces[0].shape[:2]

        print('Piece size:', self.piece_size)
        print('Loaded all pieces.\n')


    def read_piece(self, idx):

        assert(idx >= 0 and idx < self.puzzle_n)

        piece_path = os.path.join(self.puzzle_path, self.prefix + '%d.png' % idx)
        piece = cv2.imread(piece_path)
        return piece

    def read_groundtruth(self):
        
        gt_path = os.path.join(self.puzzle_path, 'groundtruth.json')
        with open(gt_path, 'r') as file:
            self.gt = json.load(file)

        max_h = 0
        max_w = 0    
        for i in range(self.puzzle_n):
            max_h = max(max_h, self.piece_size[0] + self.gt[i]['dy'])
            max_w = max(max_w, self.piece_size[1] + self.gt[i]['dx'])
        self.img_size = [max_h, max_w]

        print('Expected size of the original image:', self.img_size)
        print('Loaded groundtruth.\n')


    def apply_groundtruth(self, idx, display=False):
        
        assert(idx >= 0 and idx < self.puzzle_n)

        print('Idx:', idx, 'GT:', self.gt[idx])

        degree = -self.gt[idx]['rotation'] / math.pi * 180
        rotation_mat = cv2.getRotationMatrix2D((self.piece_size[1]/2, self.piece_size[1]/2), degree, 1)
        piece_rotcr = cv2.warpAffine(self.pieces[idx], rotation_mat, (self.piece_size[1], self.piece_size[0]), 
            borderMode=cv2.BORDER_CONSTANT, borderValue=tuple(self.bg_color))

        canvas = np.zeros(self.img_size + [3], np.uint8)
        
        dst_y = max(0, self.gt[idx]['dy'])
        dst_x = max(0, self.gt[idx]['dx'])
        roi = canvas[
            dst_y:self.gt[idx]['dy'] + self.piece_size[0],
            dst_x:self.gt[idx]['dx'] + self.piece_size[1]]
        
        src_y = dst_y - self.gt[idx]['dy']
        src_x = dst_x - self.gt[idx]['dx']
        canvas[
            dst_y:self.gt[idx]['dy'] + self.piece_size[0],
            dst_x:self.gt[idx]['dx'] + self.piece_size[1]] \
            = np.where(
                piece_rotcr[src_y:, src_x:] == self.bg_color, 
                roi, 
                piece_rotcr[src_y:, src_x:])

        if display:
            cv2.imshow('piece', self.pieces[idx])
            cv2.imshow('canvas', canvas)
            cv2.waitKey()


if __name__ == '__main__':
    
    # Load puzzle to memory
    puzzle_path = '../data/puzzles/10'
    puzzle = Puzzle(puzzle_path)
    puzzle.read_groundtruth()
    
    # Apply groundtruth to one piece, then show it.
    piece_idx = 10
    puzzle.apply_groundtruth(piece_idx, display=True)

