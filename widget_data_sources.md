+---------------------------+----------------------------------------------------------+------+-----+---------------------+-------------------------------+
| Field                     | Type                                                     | Null | Key | Default             | Extra                         |
+---------------------------+----------------------------------------------------------+------+-----+---------------------+-------------------------------+
| id                        | int(11)                                                  | NO   | PRI | NULL                | auto_increment                |
| widget_id                 | int(11)                                                  | NO   | MUL | NULL                |                               |
| source_table              | varchar(255)                                             | NO   |     | NULL                |                               |
| source_column_x           | varchar(255)                                             | YES  |     | NULL                |                               |
| source_column_y           | varchar(255)                                             | YES  |     | NULL                |                               |
| aggregation_type          | enum('sum','count','avg','min','max','none')             | YES  |     | count               |                               |
| filter_conditions         | longtext                                                 | YES  |     | NULL                |                               |
| group_by_column           | varchar(255)                                             | YES  |     | NULL                |                               |
| sort_column               | varchar(255)                                             | YES  |     | NULL                |                               |
| sort_direction            | enum('ASC','DESC')                                       | YES  |     | DESC                |                               |
| limit_rows                | int(11)                                                  | YES  |     | NULL                |                               |
| created_at                | timestamp                                                | YES  |     | current_timestamp() |                               |
| updated_at                | timestamp                                                | YES  |     | current_timestamp() | on update current_timestamp() |
| source_column_category    | varchar(255)                                             | YES  |     | NULL                |                               |
| source_column_size        | varchar(255)                                             | YES  |     | NULL                |                               |
| source_column_color_group | varchar(255)                                             | YES  |     | NULL                |                               |
| series_group_by           | varchar(255)                                             | YES  |     | NULL                |                               |
| value_prefix              | varchar(10)                                              | YES  |     | NULL                |                               |
| value_suffix              | varchar(10)                                              | YES  |     | NULL                |                               |
| max_categories            | int(11)                                                  | YES  |     | NULL                |                               |
| comparison_enabled        | tinyint(1)                                               | YES  |     | 0                   |                               |
| comparison_period         | enum('previous_period','same_period_last_year','custom') | YES  |     | NULL                |                               |
+---------------------------+----------------------------------------------------------+------+-----+---------------------+-------------------------------+
